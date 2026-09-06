import { beforeEach, describe, expect, it } from "vitest";

import type { PhiRuntimeModuleDefinition } from "../../../types";
import { phiWorkspaceCatalogStore } from "../../../components/workspace/catalog-store";
import { builderWorkspaceStore, getPhiDeveloperBuilderStateSnapshot } from "./developer-workspace-store";
import { createPhiBuilderHistoryContext, phiBuilderHistory, type PhiBuilderHistorySnapshot } from "./history";
import { applyPhiBuilderRuntimeModuleSelectionChanges } from "./runtime-module-selection";

const SCOPE = "public";
const MODULE_A = "@phis/test/module-a" as PhiRuntimeModuleDefinition["moduleId"];

const TEST_DEFINITIONS: readonly PhiRuntimeModuleDefinition[] = [{
  moduleId: MODULE_A,
  kind: "module",
  eligibleAreas: ["public", "admin"],
  serverBinding: { providerId: "@phis/core" as never, requiredCapabilities: [] },
  title: "Test module A",
  description: "A module eligible for two areas.",
  category: "content",
  iconFamily: "widgets",
}];

function seedCatalog() {
  phiWorkspaceCatalogStore.patch(SCOPE, (current) => ({
    ...current,
    runtimeModuleDefinitions: [...TEST_DEFINITIONS],
    runtimeModuleIdsByArea: { public: [], admin: [] },
  }));
}

describe("applyPhiBuilderRuntimeModuleSelectionChanges", () => {
  beforeEach(() => {
    phiWorkspaceCatalogStore.reset(SCOPE);
    builderWorkspaceStore.reset(SCOPE);
    phiBuilderHistory.clear(createPhiBuilderHistoryContext({ workspace: "modules", area: SCOPE }));
    seedCatalog();
  });

  it("applies a multi-area gesture as one selection patch and one history entry", () => {
    applyPhiBuilderRuntimeModuleSelectionChanges(
      [
        { area: "public", selectedIds: [MODULE_A] },
        { area: "admin", selectedIds: [MODULE_A] },
      ],
      SCOPE,
    );

    const state = getPhiDeveloperBuilderStateSnapshot(SCOPE);
    expect(state.runtimeModuleIdsByArea.public).toEqual([MODULE_A]);
    expect(state.runtimeModuleIdsByArea.admin).toEqual([MODULE_A]);
    expect(state.modulesDirtyAreas).toEqual(expect.arrayContaining(["public", "admin"]));

    // One undo takes the whole gesture back -- both areas at once.
    const context = createPhiBuilderHistoryContext({ workspace: "modules", area: SCOPE });
    const undoneSnapshots: PhiBuilderHistorySnapshot[] = [];
    phiBuilderHistory.undo(context, (snapshot) => { undoneSnapshots.push(snapshot); });
    const undoneSnapshot = undoneSnapshots[0] ?? null;
    expect(undoneSnapshot?.kind).toBe("modules");
    if (undoneSnapshot?.kind === "modules") {
      expect(Object.keys(undoneSnapshot.moduleIdsByArea).sort()).toEqual(["admin", "public"]);
    }
    // A second undo has nothing left: the gesture was one entry, not two.
    let undoneAgain = false;
    phiBuilderHistory.undo(context, () => { undoneAgain = true; });
    expect(undoneAgain).toBe(false);
  });

  it("records nothing when the normalized selection already matches", () => {
    applyPhiBuilderRuntimeModuleSelectionChanges(
      [{ area: "public", selectedIds: [] }],
      SCOPE,
    );
    const context = createPhiBuilderHistoryContext({ workspace: "modules", area: SCOPE });
    let undone = false;
    phiBuilderHistory.undo(context, () => { undone = true; });
    expect(undone).toBe(false);
    expect(getPhiDeveloperBuilderStateSnapshot(SCOPE).modulesDirtyAreas).toEqual([]);
  });

  it("drops the no-op area from a mixed gesture and records only the changed one", () => {
    applyPhiBuilderRuntimeModuleSelectionChanges(
      [
        { area: "public", selectedIds: [] },
        { area: "admin", selectedIds: [MODULE_A] },
      ],
      SCOPE,
    );
    const state = getPhiDeveloperBuilderStateSnapshot(SCOPE);
    expect(state.runtimeModuleIdsByArea.admin).toEqual([MODULE_A]);
    expect(state.modulesDirtyAreas).toEqual(["admin"]);

    const context = createPhiBuilderHistoryContext({ workspace: "modules", area: SCOPE });
    const undoneSnapshots: PhiBuilderHistorySnapshot[] = [];
    phiBuilderHistory.undo(context, (snapshot) => { undoneSnapshots.push(snapshot); });
    const undoneSnapshot = undoneSnapshots[0] ?? null;
    expect(undoneSnapshot?.kind).toBe("modules");
    if (undoneSnapshot?.kind === "modules") {
      expect(Object.keys(undoneSnapshot.moduleIdsByArea)).toEqual(["admin"]);
    }
  });

  it("refuses a selection that names an ineligible area", () => {
    expect(() => applyPhiBuilderRuntimeModuleSelectionChanges(
      [{ area: "editor", selectedIds: [MODULE_A] }],
      SCOPE,
    )).toThrow(/not eligible/);
  });
});
