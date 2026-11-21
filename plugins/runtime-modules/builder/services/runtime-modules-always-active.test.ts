import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleId } from "../../../../types";
import { buildRuntimeModuleRows } from "./runtime-modules-table";

/*
 * A Module declared `activation: "always"` -- the Asset Module -- leaves no choice on the Modules page:
 * its switch is locked, and its Area checkboxes show where it runs, disabled as a Base module's own Area is.
 */
describe("an always active Module on the Modules page", () => {
  const assets = {
    moduleId: "@acme/assets" as PhiRuntimeModuleId,
    kind: "module",
    title: "Assets",
    description: "Pictures.",
    category: "foundation",
    activation: "always",
    eligibleAreas: ["public", "app"],
  };
  const state = {
    runtimeModuleDefinitions: [assets],
    runtimeModuleIdsByArea: {},
  } as unknown as Parameters<typeof buildRuntimeModuleRows>[0];

  it("is a locked row, checked in every Area it serves, that says it is always active", () => {
    const [row] = buildRuntimeModuleRows(state, null, { areaFilter: null, showFoundation: true }, null);
    expect(row).toMatchObject({ active: true, locked: true, alwaysActive: true, area_public: true, area_app: true });
  });
});
