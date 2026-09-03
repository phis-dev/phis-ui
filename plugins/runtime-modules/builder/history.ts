"use client";

import type { PhiBuilderNavigationTree } from "../../../helpers/cms-navigation-catalog";
import type { PhiRuntimeModuleId } from "../../../types";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";
import { createPhiHistoryStore } from "../../../components/state/history-store";

export type PhiBuilderHistoryWorkspace = "structure" | "pages" | "navigation" | "modules";

export type PhiBuilderHistorySnapshot =
  | {
      kind: "regionDrafts";
      drafts: Record<string, PhiDeveloperBuilderRegionDraft | null>;
    }
  | {
      kind: "navigation";
      navKey: string;
      draft: PhiBuilderNavigationTree | null;
    }
  | {
      kind: "workspace";
      state: Pick<
        PhiDeveloperBuilderWorkspaceState,
        | "customPages"
        | "deletedPageDrafts"
        | "pageMetaDrafts"
      >;
    }
  | {
      /**
       * The Module selection of one Area, and nothing else.
       *
       * A `"workspace"` snapshot restores every field it captured, so bundling the selection in there
       * would mean an unrelated Page-meta undo puts a stale selection back -- for whichever Area last
       * changed it, not the Area the undo is even about. This kind is scoped to one Area's own list.
       */
      kind: "modules";
      area: PhiDeveloperBuilderArea;
      moduleIds: readonly PhiRuntimeModuleId[] | null;
    };

export const phiBuilderHistory = createPhiHistoryStore<PhiBuilderHistorySnapshot>(
  "@phis/ui/builder-history",
);

export function createPhiBuilderHistoryContext(input: {
  workspace: PhiBuilderHistoryWorkspace;
  area: PhiDeveloperBuilderArea;
  pageKey?: string | null;
  navKey?: string | null;
}) {
  if (input.workspace === "structure") {
    return `structure:${input.area}`;
  }
  if (input.workspace === "navigation") {
    return `navigation:${input.area}:${input.navKey?.trim() || "default"}`;
  }
  if (input.workspace === "modules") {
    return `modules:${input.area}`;
  }
  return `pages:${input.area}:${input.pageKey?.trim() || "home"}`;
}

export function createPhiBuilderRegionHistoryContext(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  pageScoped: boolean;
}) {
  return createPhiBuilderHistoryContext({
    workspace: input.pageScoped ? "pages" : "structure",
    area: input.area,
    pageKey: input.pageKey,
  });
}

export function capturePhiBuilderWorkspaceHistoryState(
  state: PhiDeveloperBuilderWorkspaceState,
): Extract<PhiBuilderHistorySnapshot, { kind: "workspace" }>["state"] {
  return {
    customPages: state.customPages,
    deletedPageDrafts: state.deletedPageDrafts,
    pageMetaDrafts: state.pageMetaDrafts,
  };
}

export function capturePhiBuilderModulesHistoryState(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "runtimeModuleIdsByArea">,
  area: PhiDeveloperBuilderArea,
): Extract<PhiBuilderHistorySnapshot, { kind: "modules" }> {
  return {
    kind: "modules",
    area,
    moduleIds: state.runtimeModuleIdsByArea?.[area] ?? null,
  };
}
