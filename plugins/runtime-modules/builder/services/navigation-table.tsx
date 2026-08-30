"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../../constants/cms-areas";
import { createPhiDraftCmsInstanceId, type PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type {
  PhiTableProviderMutationRequest,
  PhiTableProviderQueryRequest,
  PhiTableProviderMutationResult,
  PhiTableRowIdentity,
} from "../../../../types/table-widget";
import { PhiTableProviderClient, type PhiTableProviderRegistration } from "../../../../components/widgets/client/shared/phi-table-provider";
import { createPhiBuilderHistoryContext, phiBuilderHistory } from "../history";
import {
  loadPhiBuilderNavigationDraft,
  loadPhiBuilderNavigationScope,
  savePhiBuilderNavigationDraft,
} from "../navigation-persistence";
import { PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM } from "../../../../helpers/cms-scope-search-params";
import { getPhiDeveloperBuilderStateSnapshot, usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import {
  getPhiBuilderNavigationDraftSnapshot,
  setPhiBuilderNavigationDraft,
  updatePhiBuilderNavigationDraft,
  usePhiBuilderNavigationDraft,
} from "../navigation-store";
import {
  createPhiBuilderCustomNavigationSurface,
  formatPhiBuilderNavigationScopeKey,
  normalizePhiBuilderNavigationLocalKey,
  requirePhiBuilderNavigationScopeKey,
  resolvePhiBuilderNavigationSurface,
  type PhiBuilderNavigationItem,
  type PhiBuilderNavigationTree,
} from "../../../../helpers/cms-navigation-catalog";
import {
  parsePhiBuilderNavigationPageDragSourceKey,
  resolvePhiBuilderNavigationWidgetNavKey,
} from "../navigation-widget-runtime";
import { resolvePhiBuilderActivePageCatalog, type PhiPresetPageNode } from "../../../../helpers/cms-page-catalog";
import { resolvePhiBuilderNavigationTargetPath } from "../../../../helpers/cms-paths";
import { PHI_BUILDER_NAVIGATION_DND_TYPE_PAGE } from "../../../../constants/builder-navigation-dnd";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/builder/data-providers";
import { isPhiExternalHref } from "../../../../helpers/external-href";
import { readPhiInternalReference } from "../../../../types/references";
import { phiWorkspaceCatalogStore } from "../../../../components/workspace/catalog-store";

type LoadedNavigation = { navKey: string; navigation: PhiBuilderNavigationTree };
const PHI_DELETED_NAVIGATION_PAGE_TARGET = "@phi/deleted-page-target";

function resolveNavigationTableType(item: PhiBuilderNavigationItem) {
  return item.kind === "link" && item.external === true ? "external" : item.kind;
}

function flattenPages(pages: readonly PhiPresetPageNode[]): PhiPresetPageNode[] {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}

function flattenNavigationRows(
  items: readonly PhiBuilderNavigationItem[],
  moduleTitles: ReadonlyMap<string, string>,
  pagePaths: ReadonlyMap<string, { path: string; deleted: boolean }>,
  parentId: PhiTableRowIdentity | null = null,
  hiddenByAncestor = false,
): Record<string, unknown>[] {
  return items.flatMap((item) => {
    const pageTarget = item.targetReference ? pagePaths.get(item.targetReference) : null;
    return [{
    id: item.id,
    parentId,
    canAcceptChildren: item.kind === "container",
    icon: item.icon ?? "",
    label: item.label,
    navigationType: resolveNavigationTableType(item),
    origin: item.ownerModuleId ? moduleTitles.get(item.ownerModuleId) ?? item.ownerModuleId : "Site",
    href: item.targetReference && (item.targetDeleted === true || pageTarget?.deleted === true || !pageTarget)
      ? PHI_DELETED_NAVIGATION_PAGE_TARGET
      : pageTarget?.path ?? item.href ?? "",
    targetDeleted: item.targetDeleted === true || pageTarget?.deleted === true,
    source: item.source,
    hidden: item.hidden,
    hiddenByAncestor,
    external: item.external === true,
    newTabEditable: item.kind === "link",
    newTab: item.newTab === true,
  }, ...flattenNavigationRows(
    item.children,
    moduleTitles,
    pagePaths,
    item.id,
    hiddenByAncestor || item.hidden,
  )];
  });
}

function findNavigationItem(items: readonly PhiBuilderNavigationItem[], id: string): PhiBuilderNavigationItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findNavigationItem(item.children, id);
    if (child) return child;
  }
  return null;
}

function updateNavigationItem(
  items: readonly PhiBuilderNavigationItem[],
  id: string,
  patch: (item: PhiBuilderNavigationItem) => PhiBuilderNavigationItem,
): PhiBuilderNavigationItem[] {
  return items.map((item) => item.id === id
    ? patch(item)
    : { ...item, children: updateNavigationItem(item.children, id, patch) });
}

function extractNavigationItem(
  items: readonly PhiBuilderNavigationItem[],
  id: string,
): { items: PhiBuilderNavigationItem[]; item: PhiBuilderNavigationItem | null } {
  let extracted: PhiBuilderNavigationItem | null = null;
  const next: PhiBuilderNavigationItem[] = [];
  for (const item of items) {
    if (item.id === id) {
      extracted = item;
      continue;
    }
    const childResult: { items: PhiBuilderNavigationItem[]; item: PhiBuilderNavigationItem | null } | null =
      extracted ? null : extractNavigationItem(item.children, id);
    if (childResult?.item) {
      extracted = childResult.item;
      next.push({ ...item, children: childResult.items });
    } else {
      next.push(item);
    }
  }
  return { items: next, item: extracted };
}

function insertNavigationItem(
  items: readonly PhiBuilderNavigationItem[],
  parentId: string | null,
  beforeId: string | null,
  afterId: string | null,
  item: PhiBuilderNavigationItem,
): PhiBuilderNavigationItem[] {
  if (parentId) {
    return updateNavigationItem(items, parentId, (parent) => {
      if (parent.kind !== "container") throw new Error("Navigation target cannot contain children.");
      return { ...parent, children: insertNavigationItem(parent.children, null, beforeId, afterId, item) };
    });
  }
  const next = [...items];
  const anchorId = beforeId ?? afterId;
  const anchorIndex = anchorId ? next.findIndex((candidate) => candidate.id === anchorId) : -1;
  const index = anchorIndex < 0 ? next.length : anchorIndex + (afterId ? 1 : 0);
  next.splice(index, 0, item);
  return next;
}

function removeNavigationItemForAction(items: readonly PhiBuilderNavigationItem[], id: string) {
  return items.flatMap((item): PhiBuilderNavigationItem[] => {
    if (item.id === id) return item.kind === "container" ? item.children : [];
    return [{ ...item, children: removeNavigationItemForAction(item.children, id) }];
  });
}

function createNavigationItem(
  id: PhiBuilderNavigationItem["id"],
  kind: "link" | "container" | "separator",
): PhiBuilderNavigationItem {
  if (kind === "separator") return {
    id, source: "custom", ownerModuleId: null, kind: "separator", label: "Separator",
    href: null, icon: null, hidden: false, children: [],
  };
  if (kind === "container") return {
    id, source: "custom", ownerModuleId: null, kind: "container", label: "Container",
    href: null, icon: null, hidden: false, children: [],
  };
  return {
    id, source: "custom", ownerModuleId: null, kind: "link",
    label: "External link", href: "https://", icon: null, hidden: false,
    external: true, newTab: false, children: [],
  };
}

function createPageNavigationItem(
  id: PhiBuilderNavigationItem["id"],
  area: Parameters<typeof resolvePhiBuilderNavigationTargetPath>[0],
  reference: string,
  pages: readonly PhiPresetPageNode[],
): PhiBuilderNavigationItem | null {
  const parsed = readPhiInternalReference(reference);
  const pageReference = parsed?.kind === "page" ? parsed.reference : null;
  const page = pageReference
    ? flattenPages(pages).find((candidate) => candidate.reference === pageReference)
    : null;
  return page ? {
    id, source: "custom", ownerModuleId: null, kind: "link", label: page.title,
    href: resolvePhiBuilderNavigationTargetPath(area, page.key, pages),
    targetReference: pageReference!,
    targetDeleted: page.tombstoned === true,
    icon: null,
    hidden: false, children: [],
  } : null;
}

export function PhiBuilderNavigationTableProviderClient({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const navigationSearchValue = searchParams.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM);
  const builderState = usePhiDeveloperBuilderStateValue("public", (state) => state);
  const activeNavigationKey = resolvePhiBuilderNavigationWidgetNavKey(
    undefined,
    navigationSearchValue,
    builderState.area,
  );
  const activeNavigationDraft = usePhiBuilderNavigationDraft(activeNavigationKey);
  const loaded = useRef(new Map<string, LoadedNavigation>());
  const loading = useRef(new Map<string, Promise<PhiBuilderNavigationTree>>());
  const allocationInitializations = useRef(new Map<string, Promise<void>>());
  const initializedHistoryScopes = useRef(new Set<string>());

  const registration = useMemo<PhiTableProviderRegistration>(() => {
    const resolveScope = (params?: Record<string, unknown>) => {
      const state = getPhiDeveloperBuilderStateSnapshot("public");
      const requestedNavKey = typeof params?.navKey === "string" ? params.navKey : navigationSearchValue;
      const navKey = resolvePhiBuilderNavigationWidgetNavKey(undefined, requestedNavKey ?? null, state.area);
      const surfaces = state.navigationSurfacesByArea[state.area];
      if (!surfaces) throw new Error("Navigation surfaces are not loaded.");
      return {
        state,
        navKey,
        descriptorSurface: resolvePhiBuilderNavigationSurface(surfaces, navKey),
      };
    };

    const readNavigation = async (params?: Record<string, unknown>) => {
      const scope = resolveScope(params);
      const draft = getPhiBuilderNavigationDraftSnapshot(scope.navKey) ??
        (scope.navKey === activeNavigationKey ? activeNavigationDraft : null);
      if (draft) return { ...scope, navigation: draft };
      const cached = loaded.current.get(scope.navKey)?.navigation;
      if (cached) return { ...scope, navigation: cached };
      let pending = loading.current.get(scope.navKey);
      if (!pending) {
        pending = loadPhiBuilderNavigationScope(scope.navKey, scope.descriptorSurface)
          .then((result) => {
            if (result.draftRevisionId != null) setPhiBuilderNavigationDraft(scope.navKey, result.navigation);
            else loaded.current.set(scope.navKey, { navKey: scope.navKey, navigation: result.navigation });
            if (!initializedHistoryScopes.current.has(scope.navKey)) {
              initializedHistoryScopes.current.add(scope.navKey);
              phiBuilderHistory.clear(createPhiBuilderHistoryContext({
                workspace: "navigation",
                area: scope.state.area,
                navKey: scope.navKey,
              }));
            }
            return result.navigation;
          })
          .finally(() => loading.current.delete(scope.navKey));
        loading.current.set(scope.navKey, pending);
      }
      return { ...scope, navigation: await pending };
    };

    const writeNavigation = (scope: Awaited<ReturnType<typeof readNavigation>>, items: PhiBuilderNavigationItem[]) => {
      const navigation = { ...scope.navigation, key: requirePhiBuilderNavigationScopeKey(scope.navKey), items };
      loaded.current.delete(scope.navKey);
      setPhiBuilderNavigationDraft(scope.navKey, navigation, {
        historyContext: createPhiBuilderHistoryContext({ workspace: "navigation", area: scope.state.area, navKey: scope.navKey }),
        historyLabel: "Update navigation",
      });
      return navigation;
    };

    const allocateItem = async (scope: Awaited<ReturnType<typeof readNavigation>>) => {
      let navigation = getPhiBuilderNavigationDraftSnapshot(scope.navKey) ?? scope.navigation;
      if (!navigation.draftAllocation) {
        let pending = allocationInitializations.current.get(scope.navKey);
        if (!pending) {
          pending = (async () => {
            const current = getPhiBuilderNavigationDraftSnapshot(scope.navKey) ?? scope.navigation;
            if (current.draftAllocation) return;
            const persistedDraft = await loadPhiBuilderNavigationDraft(scope.navKey, scope.descriptorSurface);
            const allocation = persistedDraft?.navigation.draftAllocation ?? null;
            const resolvedAllocation = allocation ?? await savePhiBuilderNavigationDraft(current).then((saved) => ({
              revisionId: saved.revisionId,
              nextNodeSequence: saved.nextNodeSequence,
            }));
            updatePhiBuilderNavigationDraft(scope.navKey, (latest) => ({
              ...(latest ?? persistedDraft?.navigation ?? current),
              draftAllocation: resolvedAllocation,
            }));
          })().finally(() => allocationInitializations.current.delete(scope.navKey));
          allocationInitializations.current.set(scope.navKey, pending);
        }
        await pending;
      }
      let id: PhiCmsInstanceId | null = null;
      navigation = updatePhiBuilderNavigationDraft(scope.navKey, (current) => {
        const active = current ?? navigation;
        const allocation = active.draftAllocation;
        if (!allocation) {
          throw new Error(`Navigation Draft "${scope.navKey}" has no allocation state.`);
        }
        id = createPhiDraftCmsInstanceId({
          domain: "navigation",
          draftRevisionId: allocation.revisionId,
          sequence: allocation.nextNodeSequence,
        });
        return {
          ...active,
          draftAllocation: { ...allocation, nextNodeSequence: allocation.nextNodeSequence + 1 },
        };
      });
      if (!id) throw new Error(`Navigation Draft "${scope.navKey}" failed to allocate an item id.`);
      return {
        id,
        scope: { ...scope, navigation },
      };
    };

    const query = async (request: PhiTableProviderQueryRequest) => {
      if (request.resourceKey !== "navigationItems") throw new Error("Unknown Navigation Table resource.");
      const scope = await readNavigation(request.params);
      const moduleTitles = new Map(scope.state.runtimeModuleDefinitions.map((module) => [module.moduleId, module.title]));
      const pages = resolvePhiBuilderActivePageCatalog(
        scope.state.area,
        scope.state.modulePresetPagesByArea,
        scope.state.customPages,
        scope.state.persistedPageCatalogByArea,
      );
      const pagePaths = new Map(flattenPages(pages).flatMap((page) => page.reference ? [[page.reference, {
        path: resolvePhiBuilderNavigationTargetPath(scope.state.area, page.key, pages),
        deleted: page.tombstoned === true,
      }] as const] : []));
      const rows = flattenNavigationRows(scope.navigation.items, moduleTitles, pagePaths);
      return {
        rows,
        total: rows.length,
        summary: {
          entries: rows.length,
          hidden: rows.filter((row) => row.hidden === true || row.hiddenByAncestor === true).length,
        },
      };
    };

    const accepted = (
      invalidation: "none" | "view",
      rowPatch?: Record<string, unknown>,
      summaryPatch?: Record<string, number>,
    ): PhiTableProviderMutationResult => ({
      status: "accepted",
      invalidation,
      ...(rowPatch ? { rowPatch } : {}),
      ...(summaryPatch ? { summaryPatch } : {}),
    });

    const mutate = async (request: PhiTableProviderMutationRequest): Promise<PhiTableProviderMutationResult> => {
      if (request.resourceKey !== "navigationItems") throw new Error("Unknown Navigation Table resource.");
      if (request.kind === "action" && request.actionKey === "create-navigation") {
        const localKey = typeof request.actionValue === "string"
          ? normalizePhiBuilderNavigationLocalKey(request.actionValue)
          : null;
        if (!localKey) {
          return { status: "rejected", invalidation: "none", errorCode: "invalid-navigation-key", message: "Navigation key is invalid." };
        }
        const state = getPhiDeveloperBuilderStateSnapshot("public");
        const cmsArea = resolvePhiBuilderAreaAsCmsArea(state.area);
        const navKey = formatPhiBuilderNavigationScopeKey(cmsArea, localKey);
        const surfaces = state.navigationSurfacesByArea[state.area] ?? [];
        if (surfaces.some((surface) => surface.navKey === navKey)) {
          return { status: "rejected", invalidation: "none", errorCode: "navigation-exists", message: "Navigation already exists." };
        }
        const surface = createPhiBuilderCustomNavigationSurface(navKey, localKey);
        phiWorkspaceCatalogStore.patch("public", (current) => ({
          ...current,
          navigationSurfacesByArea: {
            ...current.navigationSurfacesByArea,
            [state.area]: [...(current.navigationSurfacesByArea[state.area] ?? []), surface],
          },
        }));
        const navigation = (await loadPhiBuilderNavigationScope(navKey, surface)).navigation;
        const saved = await savePhiBuilderNavigationDraft(navigation);
        setPhiBuilderNavigationDraft(navKey, {
          ...navigation,
          draftAllocation: { revisionId: saved.revisionId, nextNodeSequence: saved.nextNodeSequence },
        });
        return { status: "accepted", invalidation: "none", canonicalValue: navKey };
      }
      const scope = await readNavigation(request.params);
      if (request.kind === "field") {
        const id = String(request.rowIdentity);
        const item = findNavigationItem(scope.navigation.items, id);
        if (!item) return { status: "rejected", invalidation: "none", errorCode: "not-found", message: "Navigation item not found." };
        const patch: Partial<PhiBuilderNavigationItem> = {};
        if (request.fieldKey === "label" && typeof request.proposedValue === "string") {
          patch.label = request.proposedValue;
        } else if (request.fieldKey === "href" && typeof request.proposedValue === "string" &&
          item.kind === "link" && item.source === "custom" && item.external === true) {
          if (!isPhiExternalHref(request.proposedValue)) {
            return { status: "rejected", invalidation: "none", errorCode: "invalid-external-href", message: "External navigation links require an external URL." };
          }
          patch.href = request.proposedValue;
          patch.external = true;
        } else if (request.fieldKey === "icon" &&
          (typeof request.proposedValue === "string" || request.proposedValue === null)) {
          patch.icon = request.proposedValue || null;
        }
        else if (request.fieldKey === "newTab" && typeof request.proposedValue === "boolean" &&
          item.kind === "link") patch.newTab = request.proposedValue;
        else return { status: "rejected", invalidation: "none", errorCode: "field-readonly", message: "Navigation field cannot be changed." };
        writeNavigation(scope, updateNavigationItem(scope.navigation.items, id, (current) => ({ ...current, ...patch })));
        return accepted("none", patch as Record<string, unknown>);
      }
      if (request.kind === "row-move") {
        const movedId = String(request.movedRowIdentity);
        const parentId = request.targetParentRowIdentity == null ? null : String(request.targetParentRowIdentity);
        const moved = findNavigationItem(scope.navigation.items, movedId);
        if (!moved || (parentId && findNavigationItem(moved.children, parentId))) {
          return { status: "rejected", invalidation: "none", errorCode: "invalid-move", message: "Navigation item cannot be moved there." };
        }
        const extracted = extractNavigationItem(scope.navigation.items, movedId);
        if (!extracted.item) return { status: "rejected", invalidation: "none", errorCode: "not-found" };
        const items = insertNavigationItem(
          extracted.items,
          parentId,
          request.beforeRowIdentity == null ? null : String(request.beforeRowIdentity),
          request.afterRowIdentity == null ? null : String(request.afterRowIdentity),
          extracted.item,
        );
        writeNavigation(scope, items);
        return accepted("view");
      }
      if (request.kind === "drop") {
        if (request.payloadType !== PHI_BUILDER_NAVIGATION_DND_TYPE_PAGE) {
          return { status: "rejected", invalidation: "none", errorCode: "drop-type" };
        }
        const source = parsePhiBuilderNavigationPageDragSourceKey(request.sourceObjectIdentity);
        if (!source) return { status: "rejected", invalidation: "none", errorCode: "drop-source" };
        const allocated = await allocateItem(scope);
        const pages = resolvePhiBuilderActivePageCatalog(
          source.area,
          allocated.scope.state.modulePresetPagesByArea,
          allocated.scope.state.customPages,
          allocated.scope.state.persistedPageCatalogByArea,
        );
        const item = createPageNavigationItem(allocated.id, source.area, source.reference, pages);
        if (!item) return { status: "rejected", invalidation: "none", errorCode: "page-not-found" };
        writeNavigation(allocated.scope, insertNavigationItem(
          allocated.scope.navigation.items,
          request.targetParentRowIdentity == null ? null : String(request.targetParentRowIdentity),
          request.beforeRowIdentity == null ? null : String(request.beforeRowIdentity),
          request.afterRowIdentity == null ? null : String(request.afterRowIdentity),
          item,
        ));
        return accepted("view");
      }
      if (request.kind === "action") {
        if ((request.actionKey === "hide" || request.actionKey === "show" || request.actionKey === "delete") &&
          request.rowIdentity != null) {
          const id = String(request.rowIdentity);
          const item = findNavigationItem(scope.navigation.items, id);
          if (!item) return { status: "rejected", invalidation: "none", errorCode: "not-found" };
          if ((request.actionKey === "hide" || request.actionKey === "show") && item.source === "module") {
            const hidden = request.actionKey === "hide";
            const items = updateNavigationItem(scope.navigation.items, id, (current) => ({ ...current, hidden }));
            writeNavigation(scope, items);
            const moduleTitles = new Map(scope.state.runtimeModuleDefinitions.map((module) => [module.moduleId, module.title]));
            const pages = resolvePhiBuilderActivePageCatalog(
              scope.state.area,
              scope.state.modulePresetPagesByArea,
              scope.state.customPages,
              scope.state.persistedPageCatalogByArea,
            );
            const pagePaths = new Map(flattenPages(pages).flatMap((page) => page.reference ? [[page.reference, {
              path: resolvePhiBuilderNavigationTargetPath(scope.state.area, page.key, pages),
              deleted: page.tombstoned === true,
            }] as const] : []));
            const rows = flattenNavigationRows(items, moduleTitles, pagePaths);
            return accepted("none", { hidden }, {
              hidden: rows.filter((row) => row.hidden === true || row.hiddenByAncestor === true).length,
            });
          }
          if (request.actionKey !== "delete" || item.source !== "custom") {
            return { status: "rejected", invalidation: "none", errorCode: "action-not-allowed" };
          }
          writeNavigation(scope, removeNavigationItemForAction(scope.navigation.items, id));
          return accepted("view");
        }
        const kind = request.actionKey === "add-link" ? "link"
          : request.actionKey === "add-container" ? "container"
            : request.actionKey === "add-separator" ? "separator" : null;
        if (!kind) return { status: "rejected", invalidation: "none", errorCode: "unknown-action" };
        const allocated = await allocateItem(scope);
        const selectedId = request.selectedRowIdentities?.[0] == null ? null : String(request.selectedRowIdentities[0]);
        const selected = selectedId ? findNavigationItem(allocated.scope.navigation.items, selectedId) : null;
        const parentId = selected?.kind === "container" ? selected.id : null;
        const afterId = selected && selected.kind !== "container" ? selected.id : null;
        writeNavigation(allocated.scope, insertNavigationItem(
          allocated.scope.navigation.items, parentId, null, afterId, createNavigationItem(allocated.id, kind),
        ));
        return accepted("view");
      }
      return { status: "rejected", invalidation: "none", errorCode: "unsupported-mutation" };
    };

    const descriptor = PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find((candidate) =>
      candidate.key === PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.navigationTable);
    return {
      key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.navigationTable,
      resources: descriptor?.kind === "table" ? descriptor.resources.map((resource) => ({
        ...resource,
        bindingFields: "bindingFields" in resource ? resource.bindingFields?.map((field) => field.key === "navKey"
          ? {
              ...field,
              defaultValue: resolvePhiBuilderNavigationWidgetNavKey(undefined, navigationSearchValue, builderState.area),
            }
          : field) : undefined,
      })) : [],
      query,
      mutate,
    };
  }, [activeNavigationDraft, activeNavigationKey, builderState, navigationSearchValue]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
