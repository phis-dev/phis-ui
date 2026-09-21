"use client";

import type { PhiCollectionProviderResourceDescriptor } from "../../../types/collection-provider";
import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  findPhiBuilderWidgetNodeByIdInLayouts,
  findPhiBuilderWidgetNodeByIdInWidgets,
} from "./node-finders";
import { resolveRegionDraftKey } from "./developer-region-drafts";
import { getPhiDeveloperRegionDraftsSnapshot } from "./developer-workspace-store";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";

/**
 * The Widget the Inspector is editing, as it stands in the draft.
 *
 * From the draft and not from what was published, because everything asked of it here -- which Provider
 * it is bound to, and therefore what it may emit and what may draw it -- changes while the author is
 * still editing, and a question answered from the published copy would answer for the wrong Widget.
 */
export function findPhiBuilderSelectedWidgetNode(state: PhiDeveloperBuilderWorkspaceState) {
  if (state.nodeKind !== "widget" || state.nodeId == null || !state.selectedRootRegionKey) {
    return null;
  }
  const draft = resolveRegionDraftKey(
    getPhiDeveloperRegionDraftsSnapshot(),
    state.area,
    state.selectedRootRegionKey,
    state.pageKey,
  );
  if (!draft) {
    return null;
  }
  return findPhiBuilderWidgetNodeByIdInWidgets(draft.rootNodeChildWidgets ?? [], state.nodeId) ??
    findPhiBuilderWidgetNodeByIdInLayouts(draft.rootNodeChildLayouts ?? [], state.nodeId) ??
    null;
}

/**
 * The Collection resource a Widget's config is bound to, as its owning Module described it.
 *
 * Two questions about a generic Collection Widget are answered by the resource rather than by the
 * Widget: what a selection means (`selectionValueSchema`) and what draws an item (`itemRendererKey`).
 * Both are read here, from the same binding, because both stop being answerable the moment the binding
 * is cleared.
 */
export function readPhiBuilderBoundCollectionResource(
  config: Record<string, unknown> | null | undefined,
  dataProviders: readonly PhiRuntimeModuleDataProviderDescriptor[],
): PhiCollectionProviderResourceDescriptor | null {
  const source = config?.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }
  const { providerKey, resourceKey } = source as { providerKey?: unknown; resourceKey?: unknown };
  if (typeof providerKey !== "string" || typeof resourceKey !== "string") {
    return null;
  }
  const provider = dataProviders.find((candidate) => candidate.key === providerKey);
  if (provider?.kind !== "collection") {
    return null;
  }
  return provider.resources.find((resource) => resource.resourceKey === resourceKey) ?? null;
}

/** The item contract of whatever the selected Widget is bound to, which is what a renderer offers against. */
export function resolvePhiBuilderSelectedCollectionItemContract(
  state: PhiDeveloperBuilderWorkspaceState,
  dataProviders: readonly PhiRuntimeModuleDataProviderDescriptor[],
) {
  const widget = findPhiBuilderSelectedWidgetNode(state);
  return readPhiBuilderBoundCollectionResource(widget?.config, dataProviders)?.itemRendererKey ?? null;
}
