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
       * The Module selection of the Areas one edit touched, and nothing else.
       *
       * A `"workspace"` snapshot restores every field it captured, so bundling the selection in there
       * would mean an unrelated Page-meta undo puts a stale selection back. This kind carries only the
       * Areas the recorded edit actually changed: a per-Area checkbox records one, the module-wide
       * switch records every eligible Area in a single entry, so one undo takes the whole gesture back
       * instead of leaving the partial state the gesture was meant to avoid.
       */
      kind: "modules";
      moduleIdsByArea: Readonly<
        Partial<Record<PhiDeveloperBuilderArea, readonly PhiRuntimeModuleId[] | null>>
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
  if (input.workspace === "modules") {
    // The Modules workspace edits the site-wide activation matrix, so its history is one context:
    // an undo there means "the last Module change", regardless of which Area it landed in.
    return "modules:site";
  }
  return `pages:${input.area}:${input.pageKey?.trim() || "/"}`;
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
  areas: readonly PhiDeveloperBuilderArea[],
): Extract<PhiBuilderHistorySnapshot, { kind: "modules" }> {
  const moduleIdsByArea: Partial<
    Record<PhiDeveloperBuilderArea, readonly PhiRuntimeModuleId[] | null>
  > = {};
  for (const area of areas) {
    moduleIdsByArea[area] = state.runtimeModuleIdsByArea?.[area] ?? null;
  }
  return { kind: "modules", moduleIdsByArea };
}
