import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleId } from "../../../../types";
import {
  PHI_BUILDER_SHELL_PROVIDER_NOTICE,
  coversPhiBuilderStoredShellStructure,
  findPhiBuilderShellProviderHolder,
} from "./runtime-modules-table";

/**
 * One Module brings an Area's shell at a time: switching on a second is refused with the holder named,
 * and switching one on over a structure the Area stores for another shell says the structure is kept.
 */
describe("the Module that brings an Area's shell", () => {
  const site = { moduleId: "@acme/site/modules/site" as PhiRuntimeModuleId, title: "Site" };
  const other = { moduleId: "@acme/other/modules/other" as PhiRuntimeModuleId, title: "Other" };
  const plain = { moduleId: "@phis/ui/modules/docs" as PhiRuntimeModuleId, title: "Docs" };
  const base = { ownerModuleId: "@phis/ui/modules/public" as PhiRuntimeModuleId, presetKey: "public-shell" };
  const state = (
    publicIds: PhiRuntimeModuleId[],
    storedSource: { ownerModuleId: PhiRuntimeModuleId; presetKey: string } | null = null,
  ) => ({
    runtimeModuleIdsByArea: { public: publicIds },
    runtimeModuleDefinitions: [site, other, plain],
    areaShellsByArea: {
      public: { providerModuleIds: [site.moduleId, other.moduleId], storedSource },
      admin: { providerModuleIds: [], storedSource: null },
    },
  }) as unknown as Parameters<typeof findPhiBuilderShellProviderHolder>[0];

  it("refuses a second provider, naming the one that holds the Area", () => {
    expect(findPhiBuilderShellProviderHolder(state([site.moduleId]), other.moduleId, ["public"]))
      .toEqual({ areaKey: "public", holderModuleId: site.moduleId });
  });

  it("lets the first provider in, and anything that brings no shell", () => {
    expect(findPhiBuilderShellProviderHolder(state([]), site.moduleId, ["public"])).toBeNull();
    expect(findPhiBuilderShellProviderHolder(state([site.moduleId]), plain.moduleId, ["public"])).toBeNull();
    // The holder itself, switched on again in the same Area, is no second provider.
    expect(findPhiBuilderShellProviderHolder(state([site.moduleId]), site.moduleId, ["public"])).toBeNull();
  });

  it("is a question of the Area the Module brings a shell for only", () => {
    expect(findPhiBuilderShellProviderHolder(state([site.moduleId]), other.moduleId, ["admin"])).toBeNull();
  });

  it("says the stored structure stays when a provider covers a structure of another shell", () => {
    expect(coversPhiBuilderStoredShellStructure(state([], base), site.moduleId, ["public"])).toBe(true);
    expect(PHI_BUILDER_SHELL_PROVIDER_NOTICE).toBe(
      "This Module brings its own Header and Footer. The saved structure stays and comes back when the Module is switched off.",
    );
  });

  it("says nothing when nothing is stored, or the stored structure is the provider's own", () => {
    expect(coversPhiBuilderStoredShellStructure(state([]), site.moduleId, ["public"])).toBe(false);
    expect(coversPhiBuilderStoredShellStructure(
      state([], { ownerModuleId: site.moduleId, presetKey: "site-shell" }),
      site.moduleId,
      ["public"],
    )).toBe(false);
    expect(coversPhiBuilderStoredShellStructure(state([], base), plain.moduleId, ["public"])).toBe(false);
  });
});
