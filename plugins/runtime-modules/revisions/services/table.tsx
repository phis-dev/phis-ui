"use client";

import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { isPhiBuilderAreaKey, isPhiCmsAreaKey } from "../../../../constants/cms-areas";
import { hasPhiCmsPresetUpdate } from "../../../../plugins/runtime-modules/preset-version";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
} from "../../../../types/table-widget";
import type { PhiCmsPresetSource } from "../../../../types/cms-module-descriptors";
import type { PhiBuilderRevisionsWidgetLabels } from "../../../../components/widgets/label-types/revisions";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import type {
  PhiBuilderRevisionDeleteResponse,
  PhiBuilderRevisionHistoryResponse,
  PhiBuilderRevisionHistoryRow,
  PhiBuilderRevisionRestoreResponse,
  PhiBuilderRevisionScope,
} from "../types";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/revisions/data-providers";
import {
  getPhiWorkspaceCatalogSnapshot,
  PHI_WORKSPACE_CATALOG_SCOPE,
} from "../../../../components/workspace/catalog-store";
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
  resolvePhiBuilderPageKeyFromStoragePath,
} from "../../../../helpers/cms-page-catalog";
import {
  PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM,
  PHI_BUILDER_THEME_KEY_SEARCH_PARAM,
  normalizePhiBuilderRevisionsKindSearchParam,
} from "../../../../helpers/cms-scope-search-params";
import {
  resolvePhiBuilderRevisionPagePath,
  resolvePhiBuilderRevisionScope,
} from "../types";
import { resolvePhiBuilderRevisionNavScopeKey } from "../../../../helpers/cms-navigation-scope-key";

type ErrorPayload = {
  error?: string;
};

type RevisionsTableParams = {
  scope: PhiBuilderRevisionScope;
  scopeKey: string;
  reviewPagePath: string;
  navScopeKey: string;
  labels: PhiBuilderRevisionsWidgetLabels;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPresetSource(value: unknown): PhiCmsPresetSource | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.ownerModuleId === "string" &&
    typeof value.presetKey === "string" &&
    typeof value.sourcePresetVersion === "number"
    ? value as PhiCmsPresetSource
    : null;
}

function readRevisionScope(value: unknown): PhiBuilderRevisionScope | null {
  if (!isRecord(value) ||
    (value.kind !== "area" && value.kind !== "page" && value.kind !== "navigation" && value.kind !== "theme") ||
    !isPhiCmsAreaKey(value.area)
  ) {
    return null;
  }
  const sourcePreset = readPresetSource(value.sourcePreset);
  return {
    kind: value.kind,
    area: value.area,
    path: typeof value.path === "string" ? value.path : null,
    navKey: typeof value.navKey === "string" ? value.navKey : null,
    themeKey: typeof value.themeKey === "string" ? value.themeKey : null,
    sourcePreset,
  };
}

function readParams(value: unknown): RevisionsTableParams {
  if (!isRecord(value) || !isRecord(value.labels)) {
    throw new Error("Revisions table parameters are missing.");
  }
  if (!isRecord(value.scope) && typeof window !== "undefined") {
    const state = getPhiWorkspaceCatalogSnapshot(PHI_WORKSPACE_CATALOG_SCOPE);
    const search = new URLSearchParams(window.location.search);
    const kind = normalizePhiBuilderRevisionsKindSearchParam(value.kind) ??
      normalizePhiBuilderRevisionsKindSearchParam(search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM)) ??
      "area";
    const configuredScopeKey = typeof value.scopeKey === "string" && value.scopeKey.trim()
      ? value.scopeKey.trim()
      : search.get(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM)?.trim() ?? "";
    const scopeArea = kind === "area"
      ? isPhiBuilderAreaKey(configuredScopeKey)
        ? configuredScopeKey
        : state.area
      : state.area;
    const pages = resolvePhiBuilderActivePageCatalog(
      scopeArea,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    const activePageKey = resolvePhiBuilderActivePageKey(
      scopeArea === state.area ? state.pageKey : null,
      pages,
    );
    /*
     * A page is needed for a page scope and for nothing else.
     *
     * The other three kinds -- area, navigation, theme -- never read it: `resolvePhiBuilderRevisionScope`
     * takes the area, the nav key or the theme key and leaves the page alone. Demanding one anyway made
     * an Area whose pages all come from Modules unable to show the revisions it does have, which is the
     * Area a Module was just switched on in: its own history, refused for want of a page that has
     * nothing to do with it.
     */
    if (kind === "page" && !activePageKey) {
      throw new Error("Revisions scope has no active Builder page.");
    }
    const pageKey = kind === "page" && configuredScopeKey.startsWith("/")
      ? resolvePhiBuilderPageKeyFromStoragePath(scopeArea, configuredScopeKey, pages)
      : activePageKey ?? "";
    const navScopeKey = kind === "navigation" && configuredScopeKey
      ? resolvePhiBuilderRevisionNavScopeKey(scopeArea, configuredScopeKey)
      : resolvePhiBuilderRevisionNavScopeKey(
          scopeArea,
          search.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM),
        );
    const themeKey = kind === "theme" && configuredScopeKey
      ? configuredScopeKey
      : search.get(PHI_BUILDER_THEME_KEY_SEARCH_PARAM) ?? "default";
    const scope = resolvePhiBuilderRevisionScope(
      kind, scopeArea, pageKey, pages, navScopeKey,
      themeKey,
      state.areaPresetSourcesByArea[scopeArea] ?? null,
    );
    return {
      scope,
      scopeKey: [scope.kind, scope.area, scope.path ?? "", scope.sourcePreset?.ownerModuleId ?? "", scope.sourcePreset?.presetKey ?? "", scope.navKey ?? "", scope.themeKey ?? ""].join(":"),
      reviewPagePath: scope.kind === "page" && scope.path
        ? scope.path
        : resolvePhiBuilderRevisionPagePath(scopeArea, pageKey, pages),
      navScopeKey,
      labels: value.labels as unknown as PhiBuilderRevisionsWidgetLabels,
    };
  }
  const scope = readRevisionScope(value.scope);
  if (
    !scope ||
    typeof value.scopeKey !== "string" ||
    typeof value.reviewPagePath !== "string" ||
    typeof value.navScopeKey !== "string" ||
    !isRecord(value.labels)
  ) {
    throw new Error("Invalid Revisions table parameters.");
  }
  return {
    scope,
    scopeKey: value.scopeKey,
    reviewPagePath: value.reviewPagePath,
    navScopeKey: value.navScopeKey,
    labels: value.labels as unknown as PhiBuilderRevisionsWidgetLabels,
  };
}

async function readJson(response: Response) {
  return await response.json().catch(() => null) as
    | PhiBuilderRevisionHistoryResponse
    | PhiBuilderRevisionRestoreResponse
    | PhiBuilderRevisionDeleteResponse
    | ErrorPayload
    | null;
}

function readErrorMessage(body: unknown, fallback: string) {
  return isRecord(body) && typeof body.error === "string" ? body.error : fallback;
}

function buildRevisionQuery(scope: PhiBuilderRevisionScope) {
  const params = new URLSearchParams({
    kind: scope.kind,
    area: scope.area,
  });
  if (scope.kind === "page" && scope.path) {
    params.set("path", scope.path);
  }
  if ((scope.kind === "page" || scope.kind === "area") && scope.sourcePreset) {
    params.set("ownerModuleId", scope.sourcePreset.ownerModuleId);
    params.set("presetKey", scope.sourcePreset.presetKey);
  }
  if (scope.kind === "navigation" && scope.navKey) {
    params.set("navKey", scope.navKey);
  }
  if (scope.kind === "theme" && scope.themeKey) {
    params.set("themeKey", scope.themeKey);
  }
  return params;
}

async function loadRevisionHistory(scope: PhiBuilderRevisionScope, signal: AbortSignal) {
  const response = await fetch(`/api/site/cms/revisions?${buildRevisionQuery(scope).toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(readErrorMessage(body, `Failed to load revisions (${response.status}).`));
  }
  return body as PhiBuilderRevisionHistoryResponse;
}

async function restoreRevision(
  scope: PhiBuilderRevisionScope,
  revisionId: number,
  signal: AbortSignal,
) {
  const response = await fetch("/api/site/cms/revisions/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal,
    body: JSON.stringify({
      kind: scope.kind,
      area: scope.area,
      ...(scope.kind === "page" ? { path: scope.path } : {}),
      ...((scope.kind === "page" || scope.kind === "area") && scope.sourcePreset
        ? {
            ownerModuleId: scope.sourcePreset.ownerModuleId,
            presetKey: scope.sourcePreset.presetKey,
          }
        : {}),
      ...(scope.kind === "navigation" ? { navKey: scope.navKey } : {}),
      ...(scope.kind === "theme" ? { themeKey: scope.themeKey } : {}),
      revisionId,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(readErrorMessage(body, `Failed to restore revision (${response.status}).`));
  }
  return body as PhiBuilderRevisionRestoreResponse;
}

async function deleteRevisions(
  scope: PhiBuilderRevisionScope,
  revisionIds: readonly number[],
  signal: AbortSignal,
) {
  const params = buildRevisionQuery(scope);
  params.set("revisionIds", revisionIds.join(","));
  const response = await fetch(`/api/site/cms/revisions?${params.toString()}`, {
    method: "DELETE",
    credentials: "include",
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(readErrorMessage(body, `Failed to delete revisions (${response.status}).`));
  }
  return body as PhiBuilderRevisionDeleteResponse;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return value === true;
}

function formatTemplate(template: string, ...values: Array<number | string | null | undefined>) {
  let result = template;
  values.forEach((value, index) => {
    result = result.replaceAll(`%${index + 1}`, value == null || value === "" ? "-" : String(value));
  });
  return result;
}

function readDiffTotal(value: unknown) {
  return readNumber(isRecord(value) ? value.total : null) ?? 0;
}

function readRevisionSourceId(row: PhiBuilderRevisionHistoryRow, meta: Record<string, unknown> | null) {
  return readNumber(meta?.sourceRevisionId) ?? row.sourceRevisionId;
}

function readNodeChangeCount(nodes: Record<string, unknown> | null, keys: string[]) {
  return keys.reduce((total, key) => total + readDiffTotal(nodes?.[key]), 0);
}

function formatPageMetaChangeLabel(
  labels: PhiBuilderRevisionsWidgetLabels,
  pageMeta: Record<string, unknown> | null,
) {
  const titleChanged = readBoolean(pageMeta?.titleChanged);
  const descriptionChanged = readBoolean(pageMeta?.descriptionChanged);
  if (titleChanged && descriptionChanged) return labels.messages.titleAndDescriptionFields;
  if (titleChanged) return labels.messages.titleField;
  if (descriptionChanged) return labels.messages.descriptionField;
  return labels.messages.titleAndDescriptionFields;
}

function formatRevisionMessage(
  labels: PhiBuilderRevisionsWidgetLabels,
  row: PhiBuilderRevisionHistoryRow,
) {
  const meta = isRecord(row.meta) ? row.meta : null;
  const messageKey = typeof meta?.messageKey === "string" ? meta.messageKey : null;
  const sourceRevisionId = readRevisionSourceId(row, meta);
  const nodes = isRecord(meta?.nodes) ? meta.nodes : null;

  if (messageKey === "page_deleted") {
    return formatTemplate(labels.messages.pageDeleted, sourceRevisionId);
  }
  if (messageKey === "page_meta_changed") {
    return formatTemplate(
      labels.messages.pageMetaChanged,
      formatPageMetaChangeLabel(labels, isRecord(meta?.pageMeta) ? meta.pageMeta : null),
      sourceRevisionId,
    );
  }
  if (messageKey === "page_nodes_changed") {
    return formatTemplate(
      labels.messages.pageNodesChanged,
      readNodeChangeCount(nodes, ["widgets", "layouts"]),
      sourceRevisionId,
    );
  }
  if (messageKey === "page_saved") {
    return formatTemplate(labels.messages.pageSaved, sourceRevisionId);
  }
  if (messageKey === "area_nodes_changed") {
    return formatTemplate(
      labels.messages.areaNodesChanged,
      readNodeChangeCount(nodes, ["regions", "widgets", "layouts"]),
      sourceRevisionId,
    );
  }
  if (messageKey === "area_saved") {
    return formatTemplate(labels.messages.areaSaved, sourceRevisionId);
  }
  if (messageKey === "navigation_overlay_changed") {
    const navigationMeta = isRecord(meta?.navigation) ? meta.navigation : null;
    return formatTemplate(
      labels.messages.navigationOverlayChanged,
      readNumber(navigationMeta?.overrideCount) ?? 0,
      readNumber(navigationMeta?.tombstoneCount) ?? 0,
      sourceRevisionId,
    );
  }
  if (messageKey === "navigation_saved") {
    return formatTemplate(labels.messages.navigationSaved, sourceRevisionId);
  }
  if (messageKey === "theme_changed") {
    const themeMeta = isRecord(meta?.theme) ? meta.theme : null;
    return formatTemplate(
      labels.messages.themeChanged,
      typeof themeMeta?.preset === "string" ? themeMeta.preset : "custom",
      readNumber(themeMeta?.presetVersion),
      readNumber(themeMeta?.customOverrideCount) ?? 0,
      sourceRevisionId,
    );
  }
  if (messageKey === "theme_saved") {
    return formatTemplate(labels.messages.themeSaved, sourceRevisionId);
  }
  if (row.message) return row.message;
  return sourceRevisionId == null
    ? null
    : formatTemplate(labels.messages.fallbackFromRevision, sourceRevisionId);
}

function buildCmsAreaRoutePath(area: PhiBuilderRevisionScope["area"], storagePath: string) {
  const normalizedPath = storagePath.trim().startsWith("/") ? storagePath.trim() : `/${storagePath.trim()}`;
  if (area === "public") {
    return normalizedPath === "/" ? "/public" : `/public${normalizedPath}`;
  }
  return normalizedPath === "/" ? `/${area}` : `/${area}${normalizedPath}`;
}

function buildRevisionReviewHref(
  params: RevisionsTableParams,
  row: PhiBuilderRevisionHistoryRow,
) {
  const search = new URLSearchParams({
    reviewKind: params.scope.kind,
    reviewRevision: String(row.revisionId),
    reviewArea: params.scope.area,
    reviewPage: params.reviewPagePath,
  });
  if (params.scope.kind === "navigation") {
    search.set("reviewNavKey", params.navScopeKey);
  }
  if (params.scope.kind === "theme") {
    search.set("reviewThemeKey", params.scope.themeKey ?? "default");
  }
  return `${buildCmsAreaRoutePath(params.scope.area, params.reviewPagePath)}?${search.toString()}`;
}

function buildTableData(
  params: RevisionsTableParams,
  result: PhiBuilderRevisionHistoryResponse,
): PhiTableProviderQueryResult {
  const rows = result.rows.map((row, index) => {
    const isPublished =
      row.isPublished || result.current.publishedRevisionId === row.revisionId;
    const isWorkingDraft =
      row.isWorkingDraft ||
      result.current.workingDraftRevisionId === row.revisionId ||
      (
        result.current.workingDraftRevisionId == null &&
        index === 0 &&
        !isPublished
      );
    const revisionTags = [
      `#${row.revisionId}`,
      ...(isPublished ? [params.labels.publishedLabel] : []),
      ...(isWorkingDraft ? [params.labels.draftLabel] : []),
      ...(row.isDeleted ? [params.labels.deletedLabel] : []),
      ...(hasPhiCmsPresetUpdate(params.scope.sourcePreset, row.sourcePreset)
        ? [formatTemplate(
            params.labels.presetUpdateLabel,
            params.scope.sourcePreset?.sourcePresetVersion,
          )]
        : []),
    ];
    return {
      ...row,
      revisionTags,
      createdByDisplay: row.createdByLabel ?? params.labels.systemLabel,
      formattedMessage: formatRevisionMessage(params.labels, row),
      reviewHref: buildRevisionReviewHref(params, row),
      isPublished,
      isWorkingDraft,
      deleteDisabled: isPublished || isWorkingDraft,
    };
  });
  return {
    rows,
    total: rows.length,
    facets: {
      scopeKey: params.scopeKey,
      publishedRevisionId: result.current.publishedRevisionId,
      workingDraftRevisionId: result.current.workingDraftRevisionId,
    },
  };
}

async function queryRevisions(request: PhiTableProviderQueryRequest) {
  if (request.resourceKey !== "history") {
    throw new PhiTableProviderError("resource-not-found", `Unknown Revisions resource "${request.resourceKey}".`);
  }
  const params = readParams(request.params);
  return buildTableData(params, await loadRevisionHistory(params.scope, request.signal));
}

function readRevisionId(value: unknown) {
  const revisionId = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    throw new Error("Revision action requires a positive revision id.");
  }
  return revisionId;
}

async function mutateRevision(request: PhiTableProviderMutationRequest) {
  if (request.kind !== "action") {
    throw new PhiTableProviderError("mutation-not-supported", "Revisions supports Table actions only.");
  }
  if (request.resourceKey !== "history") {
    throw new PhiTableProviderError("resource-not-found", `Unknown Revisions resource "${request.resourceKey}".`);
  }
  const params = readParams(request.params);
  const current = await loadRevisionHistory(params.scope, request.signal);
  const protectedRevisionIds = new Set(
    buildTableData(params, current).rows
      .filter((row) => row.deleteDisabled === true)
      .map((row) => readRevisionId(row.revisionId)),
  );
  let action: Record<string, unknown>;

  if (request.actionKey === "restore") {
    const revisionId = readRevisionId(request.rowIdentity);
    const result = await restoreRevision(params.scope, revisionId, request.signal);
    action = {
      key: request.actionKey,
      revisionId,
      restoredRevisionId: result.revisionId,
    };
  } else if (request.actionKey === "delete") {
    const revisionId = readRevisionId(request.rowIdentity);
    if (protectedRevisionIds.has(revisionId)) {
      throw new Error(`Revision #${revisionId} is active and cannot be deleted.`);
    }
    await deleteRevisions(params.scope, [revisionId], request.signal);
    action = { key: request.actionKey, revisionId };
  } else if (request.actionKey === "deleteSelected") {
    const revisionIds = (request.selectedRowIdentities ?? []).map(readRevisionId);
    if (revisionIds.length === 0) {
      throw new Error("Delete selected requires at least one revision.");
    }
    if (revisionIds.some((revisionId) => protectedRevisionIds.has(revisionId))) {
      throw new Error("Active published or working-draft revisions cannot be deleted.");
    }
    await deleteRevisions(params.scope, revisionIds, request.signal);
    action = { key: request.actionKey, revisionIds, deletedCount: revisionIds.length };
  } else if (request.actionKey === "refresh") {
    action = { key: request.actionKey };
  } else {
    throw new Error(`Unsupported Revisions action "${request.actionKey}".`);
  }

  return { status: "accepted" as const, invalidation: "view" as const, value: action };
}

const tableDescriptor = PHI_REVISIONS_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find(
  (descriptor) => descriptor.key === PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
);
const tableResources = tableDescriptor && "resources" in tableDescriptor
  ? tableDescriptor.resources
  : undefined;

if (!tableResources) {
  throw new Error("Revisions Table provider descriptor has no resources.");
}

export const PhiRevisionsTableProviderClient = createPhiTableProviderClient({
  key: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
  resources: tableResources,
  query: queryRevisions,
  mutate: mutateRevision,
});
