"use client";

import type { PhiBuilderNavigationTree } from "../../../helpers/cms-navigation-catalog";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";
import { createPhiHistoryStore } from "../../../components/state/history-store";

export type PhiBuilderHistoryWorkspace = "structure" | "pages" | "navigation";

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
        | "runtimeModuleIdsByArea"
      >;
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
    runtimeModuleIdsByArea: state.runtimeModuleIdsByArea,
  };
}
