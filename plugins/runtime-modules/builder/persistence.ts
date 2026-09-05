"use client";

import { phiAreaPath } from "../../../helpers/locale";
import { resolvePhiBuilderAreaAsCmsArea, resolvePhiBuilderAreaMask } from "../../../constants/cms-areas";
import { PhiCmsStatus } from "../../../constants/phi-cms";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiCmsLayoutRenderNode,
  PhiCmsOverlayNode,
} from "../../../types/cms";
import { readPhiCmsInstanceId, type PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft, PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_PAGE_REGION_KEYS,
  PHI_BUILDER_SHELL_REGION_KEYS,
} from "./region-keys";
import { getPhiBuilderDefaultRegionDraft } from "./region-defaults";
import {
  buildPhiBuilderRootNodeRenderConfig,
  normalizePhiBuilderRootNodeDraft,
  type PhiBuilderRootNodeDraft,
} from "./root-node-normalization";
import { serializePhiDeveloperBuilderRegionConfig } from "./region-hydration";
import { stripPhiResolvedAssetProjections } from "../../../components/media/image-presentation";
import { resolvePhiBuilderCmsStoragePath } from "../../../helpers/cms-paths";
import type { PhiCmsWidgetContentBinding } from "../../../types/cms-plugins";
import { resolvePhiCmsRegionType } from "../../../helpers/cms-region-keys";
import type { PhiRuntimeModuleDefinition, PhiRuntimeModuleId } from "../../../types";
import {
  resolvePhiAuthUiProviderModuleId,
  resolvePhiDeclaredMediaSpaces,
  resolvePhiRuntimeModuleIdsForArea,
} from "../../../plugins/runtime-modules/settings";
import { isPhiRuntimeAreaBaseModuleId } from "../../../plugins/runtime-modules/area-definitions";
import { createPhiBuilderDraftAllocationKey } from "./draft-allocation-key";
import { builderWorkspaceStore } from "./developer-workspace-store";
import type { PhiDeveloperBuilderDraftAllocation } from "./developer-workspace-types";
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderPagePresetSource,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";
import type { PhiBuilderPluginMeta, PhiBuilderWidgetMeta } from "../../../types/builder";
import {
  PHI_AREA_CONFIG_MODULES_NAMESPACE,
  PHI_AREA_CONFIG_SHELL_NAMESPACE,
  PHI_AREA_ROOT_ROUTE_KEY,
} from "../../../helpers/cms-area-config";

type CmsDraftWriteState = PhiDeveloperBuilderDraftAllocation;

type CmsPageWritePayload = {
  area: string;
  path: string;
  sourcePreset: PhiCmsPresetSource | null;
  draft?: CmsDraftWriteState;
  pageMeta?: {
    title?: string | null;
    description?: string | null;
  };
  page?: {
    status?: number;
    flags?: number;
    visibilityMask?: number;
    heroRootLayoutNodeId?: PhiCmsInstanceId | null;
    headerBottomRootLayoutNodeId?: PhiCmsInstanceId | null;
    siderRightRootLayoutNodeId?: PhiCmsInstanceId | null;
    contentRootLayoutNodeId?: PhiCmsInstanceId | null;
    footerTopRootLayoutNodeId?: PhiCmsInstanceId | null;
    drawerRightRootLayoutNodeId?: PhiCmsInstanceId | null;
    layoutConfig?: Record<string, unknown>;
  };
  overlays: PhiCmsOverlayNode[];
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: Array<Omit<PhiCmsContentWidgetNode, "resolvedContent"> & {
    contentBinding?: PhiCmsWidgetContentBinding | null;
  }>;
};

type CmsAreaPresetWritePayload = {
  area: string;
  sourcePreset: PhiCmsPresetSource;
  draft?: CmsDraftWriteState;
  preset?: {
    status?: number;
    flags?: number;
    visibilityMask?: number;
    config?: Record<string, unknown>;
  };
  regions: Array<{
    regionType: number;
    rootLayoutNodeId: PhiCmsInstanceId;
    status?: number;
    flags?: number;
    visibilityMask?: number;
    sortOrder?: number;
    config?: Record<string, unknown>;
  }>;
  overlays: PhiCmsOverlayNode[];
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: Array<Omit<PhiCmsContentWidgetNode, "resolvedContent"> & {
    contentBinding?: PhiCmsWidgetContentBinding | null;
  }>;
};

type CmsAreaModulesWritePayload = {
  area: string;
  sourcePreset: PhiCmsPresetSource;
  draft?: CmsDraftWriteState;
  config: Record<string, unknown>;
  baseline?: CmsAreaPresetWritePayload;
};

type SerializedRoot = {
  rootLayoutNodeId: PhiCmsInstanceId;
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: Array<Omit<PhiCmsContentWidgetNode, "resolvedContent"> & {
    contentBinding?: PhiCmsWidgetContentBinding | null;
  }>;
};

export type PhiDeveloperBuilderWorkspaceKind = "structure" | "pages";

/**
 * A save that was refused because there is nothing to patch yet -- an Area with no stored revision at
 * all. Distinguished from any other save failure so a Module save can retry once, with its Shell
 * baseline attached, instead of surfacing a conflict the caller never asked about.
 */
class CmsDraftConflictError extends Error {}

function assertPersistableAreaRuntimeModuleIds(
  moduleIds: readonly PhiRuntimeModuleId[],
  moduleDefinitions: readonly PhiRuntimeModuleDefinition[],
) {
  const uniqueIds = new Set(moduleIds);
  if (uniqueIds.size !== moduleIds.length) {
    throw new Error("Area runtimeModules must not contain duplicate module ids.");
  }

  const definitionsById = new Map(moduleDefinitions.map((definition) => [definition.moduleId, definition] as const));
  for (const moduleId of moduleIds) {
    const definition = definitionsById.get(moduleId);
    if (!definition) {
      throw new Error(`Runtime module "${moduleId}" is not installed.`);
    }
    if (definition.kind !== "platform" && !isPhiRuntimeAreaBaseModuleId(moduleId)) {
      continue;
    }
    throw new Error(
      `Locked runtime module "${moduleId}" must not be persisted in Area settings.`,
    );
  }
}

function stripTransientConfig(config: Record<string, unknown> | null | undefined) {
  const stableConfig = stripPhiResolvedAssetProjections({ ...(config ?? {}) });
  delete stableConfig.renderMode;
  delete stableConfig.resolvedContent;
  delete stableConfig.preferSource;

  return stableConfig;
}

function readPersistableNodeId(id: unknown) {
  return readPhiCmsInstanceId(id);
}

function collectDraftNodeIds(draft: PhiDeveloperBuilderRegionDraft) {
  const ids: string[] = [];

  const pushId = (value: unknown) => {
    const resolved = readPersistableNodeId(value);
    if (resolved != null) {
      ids.push(resolved);
    }
  };

  const visitLayout = (node: PhiCmsLayoutRenderNode) => {
    pushId(node.id);
    for (const childLayout of node.childLayouts ?? []) {
      visitLayout(childLayout);
    }
    for (const childWidget of node.childWidgets ?? []) {
      pushId(childWidget.id);
    }
  };

  pushId(draft.rootNodeId);
  for (const childLayout of draft.rootNodeChildLayouts ?? []) {
    visitLayout(childLayout);
  }
  for (const childWidget of draft.rootNodeChildWidgets ?? []) {
    pushId(childWidget.id);
  }

  return ids;
}

function assertUniqueDraftNodeIds(drafts: PhiDeveloperBuilderRegionDraft[]) {
  const seenIds = new Set<string>();

  for (const draft of drafts) {
    for (const id of collectDraftNodeIds(draft)) {
      if (seenIds.has(id)) {
        throw new Error(`Builder draft contains duplicate node id ${id}.`);
      }

      seenIds.add(id);
    }
  }
}

function hasPersistedConfigValue(config: Record<string, unknown> | null | undefined, fieldKey: string) {
  const value = config?.[fieldKey];
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function buildPhiBuilderWidgetMetaMap(
  pluginMetas: readonly PhiBuilderPluginMeta[],
): ReadonlyMap<string, PhiBuilderWidgetMeta> {
  return new Map(
    pluginMetas
      .filter((meta): meta is PhiBuilderWidgetMeta => meta.kind === "widget")
      .map((meta) => [`${meta.pluginKey}/${meta.typeKey}`, meta]),
  );
}

function resolvePhiCmsWidgetContentBinding(
  widgetMetasByType: ReadonlyMap<string, PhiBuilderWidgetMeta>,
  widgetType: string,
  config: Record<string, unknown> | null | undefined,
) {
  const meta = widgetMetasByType.get(widgetType);
  if (!meta) {
    throw new Error(`Active Canvas module metadata does not provide widget type "${widgetType}".`);
  }
  const binding = meta.contentBinding ?? null;
  if (!binding) {
    return null;
  }

  if (binding.skipWhenConfigField && hasPersistedConfigValue(config, binding.skipWhenConfigField)) {
    return null;
  }

  if (
    binding.skipWhenConfigFieldValue &&
    config?.[binding.skipWhenConfigFieldValue.field] === binding.skipWhenConfigFieldValue.value
  ) {
    return null;
  }

  return binding;
}

/**
 * Where a widget's content binding comes from.
 *
 * `derive` asks the active Canvas metadata what this widget type binds, which is right for a tree the
 * operator is editing: the answer follows the Widget's current definition rather than what was stored
 * the last time. `carry` keeps whatever the node already holds and asks nothing -- right for a tree
 * nobody is editing, and necessary for one: a Shell preset serialized outside a Canvas has no
 * metadata to ask, and refusing there would mean refusing to store the Shell that already exists.
 */
type PhiBuilderContentBindingSource = "derive" | "carry";

function serializeRootDraft(
  draft: PhiDeveloperBuilderRegionDraft,
  widgetMetasByType: ReadonlyMap<string, PhiBuilderWidgetMeta>,
  bindings: PhiBuilderContentBindingSource = "derive",
): SerializedRoot {
  if (!draft.rootNodeTypeKey || !draft.rootNodeKind || draft.rootNodeKind === "widget") {
    throw new Error("CMS persistence requires a layout root node.");
  }
  const layoutNodes: PhiCmsLayoutNode[] = [];
  const contentWidgets: Array<Omit<PhiCmsContentWidgetNode, "resolvedContent"> & {
    contentBinding?: PhiCmsWidgetContentBinding | null;
  }> = [];

  function serializeWidget(widget: PhiCmsContentWidgetNode, parentLayoutNodeId: PhiCmsInstanceId) {
    const stableWidget = { ...widget };
    delete stableWidget.resolvedContent;
    contentWidgets.push({
      ...stableWidget,
      id: widget.id,
      siteId: -1,
      parentLayoutNodeId,
      config: stripTransientConfig(widget.config),
      ...(bindings === "derive"
        ? {
          contentBinding: resolvePhiCmsWidgetContentBinding(
            widgetMetasByType,
            widget.widgetType,
            widget.config,
          ),
        }
        : {}),
    });
  }

  function serializeLayout(node: PhiCmsLayoutRenderNode, parentLayoutNodeId: PhiCmsInstanceId | null) {
    const inputId = node.id;
    layoutNodes.push({
      id: inputId,
      siteId: -1,
      parentLayoutNodeId,
      widgetType: node.widgetType,
      slotIndex: node.slotIndex,
      sortOrder: node.sortOrder,
      status: node.status,
      flags: node.flags,
      visibilityMask: node.visibilityMask,
      label: node.label,
      config: stripTransientConfig(node.config),
    });

    for (const childLayout of node.childLayouts ?? []) {
      serializeLayout(childLayout, inputId);
    }

    for (const childWidget of node.childWidgets ?? []) {
      serializeWidget(childWidget, inputId);
    }

    return inputId;
  }

  const normalizedRootNode = normalizePhiBuilderRootNodeDraft({
    id: draft.rootNodeId ?? null,
    typeKey: draft.rootNodeTypeKey,
    kind: draft.rootNodeKind,
    title: draft.rootNodeTitle ?? null,
    packageName: draft.rootNodePackageName ?? null,
    rootNodeConfig: draft.rootNodeConfig ?? null,
    rootNodeGeometry: draft.rootNodeGeometry ?? null,
    rootNodeAnchor: draft.rootNodeAnchor ?? null,
    rootNodePadding: draft.rootNodePadding ?? null,
    rootNodeBackground: draft.rootNodeBackground ?? null,
    rootNodeBorder: draft.rootNodeBorder ?? null,
    rootNodeShadow: draft.rootNodeShadow ?? null,
    childLayouts: draft.rootNodeChildLayouts ?? [],
    childWidgets: draft.rootNodeChildWidgets ?? [],
  } satisfies PhiBuilderRootNodeDraft);
  const rootLayoutNodeId = readPersistableNodeId(draft.rootNodeId);
  if (rootLayoutNodeId == null) {
    throw new Error("CMS persistence requires a canonical root instance id.");
  }

  layoutNodes.push({
    id: rootLayoutNodeId,
    siteId: -1,
    parentLayoutNodeId: null,
    widgetType: normalizedRootNode.typeKey,
    slotIndex: 0,
    sortOrder: 0,
    status: 0,
    flags: 0,
    visibilityMask: 0,
    label: normalizedRootNode.title ?? "Root",
    config: stripTransientConfig(buildPhiBuilderRootNodeRenderConfig(normalizedRootNode, "editor")),
  });

  for (const childLayout of normalizedRootNode.childLayouts ?? []) {
    serializeLayout(childLayout, rootLayoutNodeId);
  }

  for (const childWidget of normalizedRootNode.childWidgets ?? []) {
    serializeWidget(childWidget, rootLayoutNodeId);
  }

  return {
    rootLayoutNodeId,
    layoutNodes,
    contentWidgets,
  };
}

async function postCmsDraft(
  path: string,
  payload: CmsPageWritePayload | CmsAreaPresetWritePayload | CmsAreaModulesWritePayload,
) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | {
        error?: string;
        details?: string[];
        revisionId?: number | null;
        version?: number | null;
        nextNodeSequence?: number | null;
        sourcePreset?: PhiCmsPresetSource | null;
      }
    | null;
  if (!response.ok) {
    const detail = body?.details?.length ? ` ${body.details.join(" ")}` : "";
    const message = `${body?.error ?? "CMS draft save failed."}${detail}`;
    throw response.status === 409 ? new CmsDraftConflictError(message) : new Error(message);
  }

  if (
    !Number.isSafeInteger(body?.revisionId) ||
    (body?.revisionId as number) < 1 ||
    !Number.isSafeInteger(body?.version) ||
    (body?.version as number) < 1 ||
    !Number.isSafeInteger(body?.nextNodeSequence) ||
    (body?.nextNodeSequence as number) < 1
  ) {
    throw new Error("CMS draft save returned invalid Draft allocation metadata.");
  }
  if (!Object.prototype.hasOwnProperty.call(body, "sourcePreset")) {
    throw new Error("CMS draft save returned no preset source metadata.");
  }

  return {
    revisionId: body!.revisionId as number,
    version: body!.version as number,
    nextNodeSequence: body!.nextNodeSequence as number,
    sourcePreset: body!.sourcePreset ?? null,
  };
}

async function postCmsAction(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: string; details?: string[]; revisionId?: number | null }
    | null;
  if (!response.ok) {
    const detail = body?.details?.length ? ` ${body.details.join(" ")}` : "";
    throw new Error(`${body?.error ?? "CMS action failed."}${detail}`);
  }

  return {
    revisionId: Number.isInteger(body?.revisionId) ? (body?.revisionId as number) : null,
  };
}

async function getCmsDraft(path: string, payload: Record<string, unknown>) {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (response.status === 404) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as
    | {
        error?: string;
        details?: string[];
        revisionId?: number | null;
        version?: number | null;
        nextNodeSequence?: number | null;
        sourcePreset?: PhiCmsPresetSource | null;
      }
    | null;
  if (!response.ok) {
    const detail = body?.details?.length ? ` ${body.details.join(" ")}` : "";
    throw new Error(`${body?.error ?? "CMS draft read failed."}${detail}`);
  }

  if (
    !Number.isSafeInteger(body?.revisionId) ||
    (body?.revisionId as number) < 1 ||
    !Number.isSafeInteger(body?.version) ||
    (body?.version as number) < 1 ||
    !Number.isSafeInteger(body?.nextNodeSequence) ||
    (body?.nextNodeSequence as number) < 1
  ) {
    throw new Error("CMS draft read returned invalid Draft allocation metadata.");
  }
  if (!Object.prototype.hasOwnProperty.call(body, "sourcePreset")) {
    throw new Error("CMS draft read returned no preset source metadata.");
  }

  return {
    revisionId: body!.revisionId as number,
    version: body!.version as number,
    nextNodeSequence: body!.nextNodeSequence as number,
    sourcePreset: body!.sourcePreset ?? null,
  };
}

/**
 * The href a preview opens, with no locale in it.
 *
 * A staff Area carries no locale prefix at all. The Public Area does, and the Site proxy is what puts
 * it there: a path arriving without one is redirected to the locale it resolves for this request --
 * the viewer's own choice first, then the cookie, then Accept-Language, then the Site default. Naming
 * a locale here could only be a second opinion on that question, and it was the wrong one: it read the
 * Builder's own path, which is `/builder/...` and has no locale segment to find, and fell back to a
 * hardcoded "en" on every Site.
 */
function buildPhiBuilderPreviewPath(area: PhiDeveloperBuilderArea, storagePath: string) {
  return area === "public" ? storagePath || "/" : phiAreaPath(area, storagePath);
}

function buildPhiBuilderLivePreviewHref(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
  workspaceKind: PhiDeveloperBuilderWorkspaceKind,
  revisionId: number,
) {
  void workspaceKind;
  const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);
  const href = buildPhiBuilderPreviewPath(area, storagePath);
  const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set("revision", String(revisionId));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildPhiBuilderLiveHref(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
  workspaceKind: PhiDeveloperBuilderWorkspaceKind,
) {
  void workspaceKind;
  const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);
  const href = buildPhiBuilderPreviewPath(area, storagePath);
  const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function deleteCmsDraft(path: string, payload: Record<string, unknown>) {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; details?: string[] } | null;
    const detail = body?.details?.length ? ` ${body.details.join(" ")}` : "";
    throw new Error(`${body?.error ?? "CMS draft delete failed."}${detail}`);
  }
}

function storePhiDeveloperBuilderDraftAllocation(
  allocationKey: string,
  saved: CmsDraftWriteState,
) {
  builderWorkspaceStore.patch("public", (current) => {
    const currentAllocation = current.draftAllocations[allocationKey];
    const nextNodeSequence =
      currentAllocation?.revisionId === saved.revisionId
        ? Math.max(currentAllocation.nextNodeSequence, saved.nextNodeSequence)
        : saved.nextNodeSequence;
    return {
      ...current,
      draftAllocations: {
        ...current.draftAllocations,
        [allocationKey]: {
          revisionId: saved.revisionId,
          version:
            currentAllocation?.revisionId === saved.revisionId
              ? Math.max(currentAllocation.version, saved.version)
              : saved.version,
          nextNodeSequence,
          sourcePreset: saved.sourcePreset,
        },
      },
    };
  });
}

export function clearPhiDeveloperBuilderDraftAllocation(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  workspaceKind: PhiDeveloperBuilderWorkspaceKind;
}) {
  const allocationKey = createPhiBuilderDraftAllocationKey(
    input.area,
    input.pageKey,
    input.workspaceKind === "pages" ? "page" : "area",
  );
  builderWorkspaceStore.patch("public", (current) => {
    if (!current.draftAllocations[allocationKey]) {
      return current;
    }
    const draftAllocations = { ...current.draftAllocations };
    delete draftAllocations[allocationKey];
    return { ...current, draftAllocations };
  });
}

export async function getPhiDeveloperBuilderDraftAllocation(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  pages: readonly PhiPresetPageNode[];
  workspaceKind: PhiDeveloperBuilderWorkspaceKind;
  areaPresetSource: PhiCmsPresetSource | null;
}) {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(input.area);
  const pagePresetSource = resolvePhiBuilderPagePresetSource(input.pageKey, input.pages);
  const draft =
    input.workspaceKind === "structure"
      ? await getCmsDraft("/api/site/cms/area/draft", {
          area: cmsArea,
          ownerModuleId: input.areaPresetSource?.ownerModuleId,
          presetKey: input.areaPresetSource?.presetKey,
        })
      : await getCmsDraft("/api/site/cms/page/draft", {
          area: cmsArea,
          ...(pagePresetSource
            ? {
                ownerModuleId: pagePresetSource.ownerModuleId,
                presetKey: pagePresetSource.presetKey,
              }
            : { path: resolvePhiBuilderCmsStoragePath(input.area, input.pageKey, input.pages) }),
        });
  if (!draft) {
    return null;
  }

  const allocationKey = createPhiBuilderDraftAllocationKey(
    input.area,
    input.pageKey,
    input.workspaceKind === "pages" ? "page" : "area",
  );
  storePhiDeveloperBuilderDraftAllocation(allocationKey, draft);
  return draft;
}

/** The Area's open Module draft, if the Builder does not already have it cached. */
export async function getPhiDeveloperBuilderModulesDraftAllocation(input: {
  area: PhiDeveloperBuilderArea;
  areaPresetSource: PhiCmsPresetSource | null;
}) {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(input.area);
  const draft = await getCmsDraft("/api/site/cms/area/modules/draft", {
    area: cmsArea,
    ownerModuleId: input.areaPresetSource?.ownerModuleId,
    presetKey: input.areaPresetSource?.presetKey,
  });
  if (!draft) {
    return null;
  }

  const allocationKey = createPhiBuilderDraftAllocationKey(input.area, input.area, "modules");
  storePhiDeveloperBuilderDraftAllocation(allocationKey, draft);
  return draft;
}

export function clearPhiDeveloperBuilderModulesDraftAllocation(area: PhiDeveloperBuilderArea) {
  const allocationKey = createPhiBuilderDraftAllocationKey(area, area, "modules");
  builderWorkspaceStore.patch("public", (current) => {
    if (!current.draftAllocations[allocationKey]) {
      return current;
    }
    const draftAllocations = { ...current.draftAllocations };
    delete draftAllocations[allocationKey];
    return { ...current, draftAllocations };
  });
}

/**
 * Saves an Area's Module selection, apart from its structure.
 *
 * It patches rather than writes: the server clones the source revision -- the open Module draft, or
 * otherwise the published one -- and replaces only `preset.config.modules`. There is one case that source can be
 * missing: an Area that has never been saved at all, still running on its code-owned Shell preset. The
 * server asks for that preset as `baseline` when it hits exactly that case, and only then; the Builder
 * already has it loaded (every `/builder/*` page does, regardless of which one is open), so this is the
 * one path along which a Module save reaches into Shell region drafts at all.
 *
 * Which is why the Shell preset is a second source here. The region drafts hold what a workspace has
 * *hydrated*, and the Modules workspace hydrates none: it edits a selection, not a structure. Building
 * the baseline from those alone therefore worked on the Shells page and nowhere else, and an operator
 * activating a Module for a fresh Area was told to go and create a Shell first -- for a Shell that
 * already exists in code and that they were not going to change. The preset fills whatever the drafts
 * do not hold, and an open draft still wins where there is one.
 */
export async function savePhiDeveloperBuilderModulesDraft(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    "draftAllocations" | "runtimeModuleDefinitions" | "runtimeModuleIdsByArea" | "areaPresetSourcesByArea"
  >,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  options: {
    builderPlugins: readonly PhiBuilderPluginMeta[];
    scope: { area: PhiDeveloperBuilderArea };
    /** The Area's code-owned Shell, for the one case where nothing is stored and nothing is loaded. */
    shellPresetDrafts?: Record<string, PhiDeveloperBuilderRegionDraft> | null;
  },
): Promise<{ revisionId: number; version: number; nextNodeSequence: number }> {
  const area = options.scope.area;
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const areaPresetSource = state.areaPresetSourcesByArea[area] ?? null;
  if (!areaPresetSource) {
    throw new Error(`Area "${area}" has no active shell preset source.`);
  }

  const optionalRuntimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    area,
    state.runtimeModuleIdsByArea?.[area] ?? null,
    state.runtimeModuleDefinitions,
  );
  assertPersistableAreaRuntimeModuleIds(optionalRuntimeModuleIds, state.runtimeModuleDefinitions);

  const allocationKey = createPhiBuilderDraftAllocationKey(area, area, "modules");
  const draftAllocation =
    state.draftAllocations[allocationKey] ??
    (await getPhiDeveloperBuilderModulesDraftAllocation({ area, areaPresetSource }));

  const payload: CmsAreaModulesWritePayload = {
    area: cmsArea,
    sourcePreset: draftAllocation?.sourcePreset ?? areaPresetSource,
    ...(draftAllocation ? { draft: draftAllocation } : {}),
    config: {
      // The Module namespace, and only it: `config.shell` belongs to the structure draft, and this
      // route rejects a payload that carries it.
      [PHI_AREA_CONFIG_MODULES_NAMESPACE]: {
        runtimeModules: optionalRuntimeModuleIds satisfies readonly PhiRuntimeModuleId[],
        authUiProviderModuleId: resolvePhiAuthUiProviderModuleId(
          optionalRuntimeModuleIds,
          state.runtimeModuleDefinitions,
        ),
        // Derived from the selection, never authored: the control plane holds no Module metadata, so
        // the Area preset is what carries which Spaces its Modules need and what may go in them.
        mediaSpaces: resolvePhiDeclaredMediaSpaces(
          optionalRuntimeModuleIds,
          state.runtimeModuleDefinitions,
        ),
      },
    },
  };

  let result;
  try {
    result = await postCmsDraft("/api/site/cms/area/modules", payload);
  } catch (error) {
    if (!(error instanceof CmsDraftConflictError) || draftAllocation) {
      throw error;
    }
    const widgetMetasByType = buildPhiBuilderWidgetMetaMap(options.builderPlugins);
    // The preset first, so anything a workspace actually hydrated overwrites it rather than the reverse.
    const baselineDrafts = { ...(options.shellPresetDrafts ?? {}), ...regionDrafts };
    /*
     * Bindings are carried rather than derived here, because there is nothing to derive them from: the
     * Modules workspace mounts no Canvas, so no Module's metadata is loaded, and a Shell preset names
     * Widgets of Modules this Area may not even have selected yet. What the nodes already hold is the
     * preset's own answer, which is the better one for a tree nobody is editing.
     */
    const structurePayload = buildAreaStructureWritePayload(
      area,
      baselineDrafts,
      widgetMetasByType,
      "carry",
    );
    if (!structurePayload) {
      throw error;
    }
    result = await postCmsDraft("/api/site/cms/area/modules", {
      ...payload,
      baseline: {
        area: cmsArea,
        sourcePreset: areaPresetSource,
        preset: { status: 1, flags: 0, visibilityMask: structurePayload.areaMask },
        regions: structurePayload.regions,
        overlays: structurePayload.overlays,
        layoutNodes: structurePayload.layoutNodes,
        contentWidgets: structurePayload.contentWidgets,
      },
    });
  }

  storePhiDeveloperBuilderDraftAllocation(allocationKey, result);
  return { revisionId: result.revisionId, version: result.version, nextNodeSequence: result.nextNodeSequence };
}

/** Publishes the Area's Module selection. Its structure draft, if one is open, is left exactly as it is. */
export async function publishPhiDeveloperBuilderModulesDraft(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    "draftAllocations" | "runtimeModuleDefinitions" | "runtimeModuleIdsByArea" | "areaPresetSourcesByArea"
  >,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  options: {
    builderPlugins: readonly PhiBuilderPluginMeta[];
    scope: { area: PhiDeveloperBuilderArea };
  },
) {
  const area = options.scope.area;
  const areaPresetSource = state.areaPresetSourcesByArea[area] ?? null;
  const saved = await savePhiDeveloperBuilderModulesDraft(state, regionDrafts, options);
  if (!Number.isInteger(saved.revisionId) || saved.revisionId <= 0) {
    throw new Error("Module draft save did not return a revision.");
  }

  await postCmsAction("/api/site/cms/area/modules/publish", {
    area,
    ownerModuleId: areaPresetSource?.ownerModuleId,
    presetKey: areaPresetSource?.presetKey,
    revisionId: saved.revisionId,
  });

  clearPhiDeveloperBuilderModulesDraftAllocation(area);

  return saved;
}

/** Discards the Area's Module draft, leaving its structure draft, if any, untouched. */
export async function discardPhiDeveloperBuilderModulesDraft(input: {
  area: PhiDeveloperBuilderArea;
  areaPresetSource: PhiCmsPresetSource | null;
}) {
  await deleteCmsDraft("/api/site/cms/area/modules", {
    area: resolvePhiBuilderAreaAsCmsArea(input.area),
    ownerModuleId: input.areaPresetSource?.ownerModuleId ?? "",
    presetKey: input.areaPresetSource?.presetKey ?? "",
  });
  clearPhiDeveloperBuilderModulesDraftAllocation(input.area);
}

/**
 * Serializes an Area's Shell drafts into the shape a write payload carries -- regions, layout nodes,
 * content widgets. Nothing here touches `preset.config`: `config.modules` belongs to the Module
 * selection, and `config.shell` -- the Shell's own statements about itself -- is not part of the
 * region drafts this serializes.
 *
 * Returns null when nothing is loaded for the Area at all, which is not an error -- there is simply
 * nothing to save here. A partial load, though, is refused: saving fewer than all Shell regions would
 * read as deleting the ones that were never fetched.
 */
function buildAreaStructureWritePayload(
  area: PhiDeveloperBuilderArea,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  widgetMetasByType: ReadonlyMap<string, PhiBuilderWidgetMeta>,
  bindings: PhiBuilderContentBindingSource = "derive",
) {
  const areaMask = resolvePhiBuilderAreaMask(area);
  const allAreaDrafts = PHI_BUILDER_SHELL_REGION_KEYS
    .map((regionKey) => [regionKey, regionDrafts[getPhiBuilderRegionDraftKey(area, regionKey)] ?? null] as const)
    .filter((entry): entry is [typeof PHI_BUILDER_SHELL_REGION_KEYS[number], PhiDeveloperBuilderRegionDraft] => entry[1] != null);
  if (allAreaDrafts.length === 0) {
    return null;
  }
  if (allAreaDrafts.length !== PHI_BUILDER_SHELL_REGION_KEYS.length) {
    throw new Error("Area preset save needs all area region drafts loaded to avoid deleting unchanged shell regions.");
  }
  const areaDraftEntries = allAreaDrafts.filter(
    (entry): entry is [typeof PHI_BUILDER_SHELL_REGION_KEYS[number], PhiDeveloperBuilderRegionDraft] => entry[1].rootNodeTypeKey != null,
  );

  const layoutNodes: PhiCmsLayoutNode[] = [];
  const contentWidgets: Array<Omit<PhiCmsContentWidgetNode, "resolvedContent"> & {
    contentBinding?: PhiCmsWidgetContentBinding | null;
  }> = [];
  assertUniqueDraftNodeIds(areaDraftEntries.map(([, draft]) => draft));
  const regions = areaDraftEntries.map(([regionKey, draft], index) => {
    const serializedRegion = serializeRootDraft(draft, widgetMetasByType, bindings);
    layoutNodes.push(...serializedRegion.layoutNodes);
    contentWidgets.push(...serializedRegion.contentWidgets);
    return {
      regionType: resolvePhiCmsRegionType(regionKey),
      rootLayoutNodeId: serializedRegion.rootLayoutNodeId,
      status: 1,
      flags: 0,
      visibilityMask: areaMask,
      sortOrder: index,
      config: serializePhiDeveloperBuilderRegionConfig(regionKey, draft),
    };
  });

  return {
    areaMask,
    regions,
    overlays: [] as PhiCmsOverlayNode[],
    layoutNodes,
    contentWidgets,
  };
}

export async function savePhiDeveloperBuilderDraft(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    "area" | "pageKey" | "sidebarKey" | "pageMetaDrafts" | "deletedPageDrafts" | "draftAllocations" | "modulePresetPagesByArea" | "customPages" | "persistedPageCatalogByArea" | "areaPresetSourcesByArea" | "areaRootRouteDrafts"
  >,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  workspaceKind: PhiDeveloperBuilderWorkspaceKind,
  options: {
    builderPlugins: readonly PhiBuilderPluginMeta[];
    pathname?: string | null;
    scope?: {
      area: PhiDeveloperBuilderArea;
      pageKey: string;
    };
  },
) {
  const widgetMetasByType = buildPhiBuilderWidgetMetaMap(options.builderPlugins);
  const area = options?.scope?.area ?? state.area;
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const pageKey = options?.scope?.pageKey ?? state.pageKey;
  const pages = resolvePhiBuilderActivePageCatalog(
    area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const areaMask = resolvePhiBuilderAreaMask(area);
  const pagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);
  const currentPagePresetSource = resolvePhiBuilderPagePresetSource(pageKey, pages);
  const currentAreaPresetSource = state.areaPresetSourcesByArea[area] ?? null;
  const pageMetaDraft = state.pageMetaDrafts?.[getPhiBuilderRegionDraftKey(area, "page_meta", pageKey)] ?? null;
  const isDeletedPageDraft = state.deletedPageDrafts?.[getPhiBuilderRegionDraftKey(area, "page_delete", pageKey)] === true;
  const allocationKey = createPhiBuilderDraftAllocationKey(
    area,
    pageKey,
    workspaceKind === "pages" ? "page" : "area",
  );
  const draftAllocation =
    state.draftAllocations[allocationKey] ??
    await getPhiDeveloperBuilderDraftAllocation({
      area,
      pageKey,
      pages,
      workspaceKind,
      areaPresetSource: currentAreaPresetSource,
    });
  const pagePresetSource = draftAllocation
    ? draftAllocation.sourcePreset
    : currentPagePresetSource;
  const areaPresetSource = draftAllocation
    ? draftAllocation.sourcePreset
    : currentAreaPresetSource;
  const allPageDraftEntries = PHI_BUILDER_PAGE_REGION_KEYS
    .map((regionKey) => [regionKey, regionDrafts[getPhiBuilderRegionDraftKey(area, regionKey, pageKey)] ?? null] as const)
    .filter((entry): entry is [typeof PHI_BUILDER_PAGE_REGION_KEYS[number], PhiDeveloperBuilderRegionDraft] => entry[1] != null);
  const pageDraftEntries = allPageDraftEntries
    .filter((entry): entry is [typeof PHI_BUILDER_PAGE_REGION_KEYS[number], PhiDeveloperBuilderRegionDraft] => entry[1]?.rootNodeTypeKey != null);
  let savedScopes = 0;
  let revisionId: number | null = null;
  let savedDraftState: CmsDraftWriteState | null = null;

  if (workspaceKind === "pages" && isDeletedPageDraft) {
    const result = await postCmsDraft("/api/site/cms/page", {
      area: cmsArea,
      path: pagePath,
      sourcePreset: pagePresetSource,
      ...(draftAllocation ? { draft: draftAllocation } : {}),
      ...(pageMetaDraft ? { pageMeta: pageMetaDraft } : {}),
      page: {
        status: PhiCmsStatus.Deleted,
        flags: 0,
        visibilityMask: areaMask,
        heroRootLayoutNodeId: null,
        headerBottomRootLayoutNodeId: null,
        siderRightRootLayoutNodeId: null,
        contentRootLayoutNodeId: null,
        footerTopRootLayoutNodeId: null,
        drawerRightRootLayoutNodeId: null,
        layoutConfig: {
          pageRegionConfigs: {},
        },
      },
      overlays: [],
      layoutNodes: [],
      contentWidgets: [],
    });
    storePhiDeveloperBuilderDraftAllocation(allocationKey, result);
    savedDraftState = result;
    revisionId = result.revisionId;
    savedScopes += 1;
  } else if (workspaceKind === "pages" && (pageDraftEntries.length > 0 || pageMetaDraft != null)) {
    const layoutNodes: PhiCmsLayoutNode[] = [];
    const contentWidgets: Array<Omit<PhiCmsContentWidgetNode, "resolvedContent"> & {
      contentBinding?: PhiCmsWidgetContentBinding | null;
    }> = [];
    const pageRootIds: Partial<Record<(typeof PHI_BUILDER_PAGE_REGION_KEYS)[number], PhiCmsInstanceId | null>> = {};
    const pageRegionConfigs = Object.fromEntries(
      allPageDraftEntries.map(([regionKey, draft]) => [
        regionKey,
        serializePhiDeveloperBuilderRegionConfig(regionKey, draft),
      ]),
    ) as Record<string, unknown>;
    assertUniqueDraftNodeIds(pageDraftEntries.map(([, draft]) => draft));

    for (const [regionKey, draft] of pageDraftEntries) {
      const serializedRegion = serializeRootDraft(draft, widgetMetasByType);
      pageRootIds[regionKey] = serializedRegion.rootLayoutNodeId;
      layoutNodes.push(...serializedRegion.layoutNodes);
      contentWidgets.push(...serializedRegion.contentWidgets);
    }
    const result = await postCmsDraft("/api/site/cms/page", {
      area: cmsArea,
      path: pagePath,
      sourcePreset: pagePresetSource,
      ...(draftAllocation ? { draft: draftAllocation } : {}),
      ...(pageMetaDraft ? { pageMeta: pageMetaDraft } : {}),
      page: {
        status: 1,
        flags: 0,
        visibilityMask: areaMask,
        heroRootLayoutNodeId: pageRootIds.hero ?? null,
        headerBottomRootLayoutNodeId: pageRootIds.header_bottom ?? null,
        siderRightRootLayoutNodeId: pageRootIds.sider_right ?? null,
        contentRootLayoutNodeId: pageRootIds.content ?? null,
        footerTopRootLayoutNodeId: pageRootIds.footer_top ?? null,
        drawerRightRootLayoutNodeId: pageRootIds.drawer_right ?? null,
        layoutConfig: {
          pageRegionConfigs,
        },
      },
      overlays: [],
      layoutNodes,
      contentWidgets,
    });
    storePhiDeveloperBuilderDraftAllocation(allocationKey, result);
    savedDraftState = result;
    revisionId = result.revisionId;
    savedScopes += 1;
  }

  if (workspaceKind === "structure") {
    const rootRouteDraft = state.areaRootRouteDrafts?.[area] ?? null;
    const structurePayload = buildAreaStructureWritePayload(area, regionDrafts, widgetMetasByType);
    if (structurePayload) {
      if (!areaPresetSource) {
        throw new Error(`Area "${area}" has no active shell preset source.`);
      }

      const result = await postCmsDraft("/api/site/cms/area", {
        area: cmsArea,
        sourcePreset: areaPresetSource,
        ...(draftAllocation ? { draft: draftAllocation } : {}),
        preset: {
          status: 1,
          flags: 0,
          visibilityMask: structurePayload.areaMask,
          /*
           * The structure draft owns `config.shell` whole, so it states it whole.
           *
           * The publish merge takes the owned namespace from the draft and nothing else, which means an
           * absent value is a removal rather than an omission. Sending the Area's current root route on
           * every structure save is what keeps a save that never touched it from erasing it -- and
           * sending an empty namespace is how the Builder asks for the default back.
           */
          config: {
            [PHI_AREA_CONFIG_SHELL_NAMESPACE]: rootRouteDraft
              ? { [PHI_AREA_ROOT_ROUTE_KEY]: rootRouteDraft }
              : {},
          },
        },
        regions: structurePayload.regions,
        overlays: structurePayload.overlays,
        layoutNodes: structurePayload.layoutNodes,
        contentWidgets: structurePayload.contentWidgets,
      });
      storePhiDeveloperBuilderDraftAllocation(allocationKey, result);
      savedDraftState = result;
      revisionId = result.revisionId;
      savedScopes += 1;
    }
  }

  if (savedScopes === 0 || !savedDraftState) {
    throw new Error("No persistable builder draft found for the current area/page.");
  }

  return {
    savedScopes,
    revisionId,
    version: savedDraftState.version,
    nextNodeSequence: savedDraftState.nextNodeSequence,
    previewHref:
      revisionId != null
        ? buildPhiBuilderLivePreviewHref(
            area,
            pageKey,
            pages,
            workspaceKind,
            revisionId,
          )
        : null,
  };
}

export function createPhiDeveloperBuilderInitialPageDrafts(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  title: string;
}) {
  void input.title;
  const drafts: Record<string, PhiDeveloperBuilderRegionDraft> = {};

  for (const regionKey of PHI_BUILDER_PAGE_REGION_KEYS) {
    drafts[getPhiBuilderRegionDraftKey(input.area, regionKey, input.pageKey)] = {
      ...getPhiBuilderDefaultRegionDraft(regionKey),
      rootNodeId: null,
      rootNodeTypeKey: null,
      rootNodeKind: null,
      rootNodeTitle: null,
      rootNodePackageName: null,
      rootNodeConfig: null,
      rootNodeGeometry: null,
      rootNodeAnchor: null,
      rootNodePadding: null,
      rootNodeBackground: null,
      rootNodeBorder: null,
      rootNodeShadow: null,
      rootNodeChildLayouts: [],
      rootNodeChildWidgets: [],
    };
  }

  return drafts;
}

export async function createPhiDeveloperBuilderPageDraft(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  storagePath: string;
  title: string;
  description?: string | null;
  pathname?: string | null;
}) {
  const drafts = createPhiDeveloperBuilderInitialPageDrafts(input);
  const areaMask = resolvePhiBuilderAreaMask(input.area);
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(input.area);
  const pagePath = input.storagePath;
  const pageRegionConfigs = Object.fromEntries(
    PHI_BUILDER_PAGE_REGION_KEYS.map((regionKey) => [
      regionKey,
      serializePhiDeveloperBuilderRegionConfig(
        regionKey,
        drafts[getPhiBuilderRegionDraftKey(input.area, regionKey, input.pageKey)] ?? getPhiBuilderDefaultRegionDraft(regionKey),
      ),
    ]),
  ) as Record<string, unknown>;

  const result = await postCmsDraft("/api/site/cms/page", {
    area: cmsArea,
    path: pagePath,
    sourcePreset: null,
    pageMeta: {
      title: input.title,
      description: input.description ?? null,
    },
    page: {
      status: 1,
      flags: 0,
      visibilityMask: areaMask,
      heroRootLayoutNodeId: null,
      headerBottomRootLayoutNodeId: null,
      siderRightRootLayoutNodeId: null,
      contentRootLayoutNodeId: null,
      footerTopRootLayoutNodeId: null,
      drawerRightRootLayoutNodeId: null,
      layoutConfig: {
        pageRegionConfigs,
      },
    },
    overlays: [],
    layoutNodes: [],
    contentWidgets: [],
  });
  storePhiDeveloperBuilderDraftAllocation(
    createPhiBuilderDraftAllocationKey(input.area, input.pageKey, "page"),
    result,
  );

  return {
    savedScopes: 1,
    revisionId: result.revisionId,
    version: result.version,
    nextNodeSequence: result.nextNodeSequence,
    previewHref:
      result.revisionId != null
        ? buildPhiBuilderLivePreviewHref(
            input.area,
            input.pageKey,
            [{ key: input.pageKey, title: input.title, storagePath: input.storagePath }],
            "pages",
            result.revisionId,
          )
        : null,
  };
}

export async function previewPhiDeveloperBuilderDraft(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    "area" | "pageKey" | "sidebarKey" | "modulePresetPagesByArea" | "customPages" | "persistedPageCatalogByArea" | "areaPresetSourcesByArea"
  >,
  workspaceKind: PhiDeveloperBuilderWorkspaceKind,
  options?: {
    pathname?: string | null;
    scope?: {
      area: PhiDeveloperBuilderArea;
      pageKey: string;
    };
  },
) {
  const area = options?.scope?.area ?? state.area;
  const pageKey = options?.scope?.pageKey ?? state.pageKey;
  const pages = resolvePhiBuilderActivePageCatalog(
    area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const pagePresetSource = resolvePhiBuilderPagePresetSource(pageKey, pages);
  const areaPresetSource = state.areaPresetSourcesByArea[area] ?? null;

  const draft =
    workspaceKind === "structure"
      ? await getCmsDraft("/api/site/cms/area/draft", {
          area,
          ownerModuleId: areaPresetSource?.ownerModuleId,
          presetKey: areaPresetSource?.presetKey,
        })
      : await getCmsDraft("/api/site/cms/page/draft", {
          area,
          ...(pagePresetSource
            ? {
                ownerModuleId: pagePresetSource.ownerModuleId,
                presetKey: pagePresetSource.presetKey,
              }
            : { path: resolvePhiBuilderCmsStoragePath(area, pageKey, pages) }),
        });

  if (!draft || !Number.isInteger(draft.revisionId) || (draft.revisionId as number) <= 0) {
    throw new Error("No saved draft found. Save first before opening live preview.");
  }

  return {
    revisionId: draft.revisionId,
    previewHref: buildPhiBuilderLivePreviewHref(
      area,
      pageKey,
      pages,
      workspaceKind,
      draft.revisionId as number,
    ),
  };
}

export async function publishPhiDeveloperBuilderDraft(
  state: Pick<
    PhiDeveloperBuilderWorkspaceState,
    "area" | "pageKey" | "sidebarKey" | "pageMetaDrafts" | "deletedPageDrafts" | "draftAllocations" | "runtimeModuleDefinitions" | "runtimeModuleIdsByArea" | "modulePresetPagesByArea" | "customPages" | "persistedPageCatalogByArea" | "areaPresetSourcesByArea" | "areaRootRouteDrafts"
  >,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
  workspaceKind: PhiDeveloperBuilderWorkspaceKind,
  options: {
    builderPlugins: readonly PhiBuilderPluginMeta[];
    pathname?: string | null;
    scope?: {
      area: PhiDeveloperBuilderArea;
      pageKey: string;
    };
  },
) {
  const area = options?.scope?.area ?? state.area;
  const pageKey = options?.scope?.pageKey ?? state.pageKey;
  const pages = resolvePhiBuilderActivePageCatalog(
    area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const pagePresetSource = resolvePhiBuilderPagePresetSource(pageKey, pages);
  const areaPresetSource = state.areaPresetSourcesByArea[area] ?? null;
  const saved = await savePhiDeveloperBuilderDraft(state, regionDrafts, workspaceKind, options);
  if (!Number.isInteger(saved.revisionId) || (saved.revisionId as number) <= 0) {
    throw new Error("Draft save did not return a revision.");
  }

  if (workspaceKind === "structure") {
    await postCmsAction("/api/site/cms/area/publish", {
      area,
      ownerModuleId: areaPresetSource?.ownerModuleId,
      presetKey: areaPresetSource?.presetKey,
      revisionId: saved.revisionId,
    });
  } else {
    await postCmsAction("/api/site/cms/page/publish", {
      area,
      ...(pagePresetSource
        ? {
            ownerModuleId: pagePresetSource.ownerModuleId,
            presetKey: pagePresetSource.presetKey,
          }
        : { path: resolvePhiBuilderCmsStoragePath(area, pageKey, pages) }),
      revisionId: saved.revisionId,
    });
  }

  clearPhiDeveloperBuilderDraftAllocation({ area, pageKey, workspaceKind });

  return saved;
}
