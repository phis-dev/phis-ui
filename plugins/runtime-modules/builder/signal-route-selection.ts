import { readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../types/signals";
import {
  findPhiBuilderLayoutNodeById,
  findPhiBuilderWidgetNodeByIdInLayouts,
  findPhiBuilderWidgetNodeByIdInWidgets,
} from "./node-finders";
import { resolveRegionDraftKey } from "./developer-region-drafts";
import {
  getPhiDeveloperRegionDraftsSnapshot,
  getPhiDeveloperBuilderStateSnapshot,
} from "./developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";

function resolveSelectedSignalRouteConfig(
  state: PhiDeveloperBuilderWorkspaceState,
  drafts = getPhiDeveloperRegionDraftsSnapshot(),
): Record<string, unknown> | null {
  if (!state.selectedRootRegionKey) {
    return null;
  }

  const draft = resolveRegionDraftKey(drafts, state.area, state.selectedRootRegionKey, state.pageKey);
  if (!draft) {
    return null;
  }

  if (state.nodeKind === "region") {
    return draft.regionConfig ?? null;
  }

  if (state.nodeId == null) {
    return null;
  }

  if (state.nodeId === draft.rootNodeId) {
    return draft.rootNodeConfig ?? null;
  }

  if (state.nodeKind === "widget") {
    return (
      findPhiBuilderWidgetNodeByIdInWidgets(draft.rootNodeChildWidgets ?? [], state.nodeId) ??
      findPhiBuilderWidgetNodeByIdInLayouts(draft.rootNodeChildLayouts ?? [], state.nodeId)
    )?.config ?? null;
  }

  if (state.nodeKind === "layout") {
    return findPhiBuilderLayoutNodeById(draft.rootNodeChildLayouts ?? [], state.nodeId)?.config ?? null;
  }

  return null;
}

export function getPhiDeveloperSelectedSignalRoutes(
  defaultArea: PhiDeveloperBuilderArea,
): PhiSignalRouteSet | null {
  const state = getPhiDeveloperBuilderStateSnapshot(defaultArea);
  return readPhiSignalRouteSet(resolveSelectedSignalRouteConfig(state)?.signalRoutes);
}
