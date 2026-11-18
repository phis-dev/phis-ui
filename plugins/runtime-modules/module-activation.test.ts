import { describe, expect, it, vi } from "vitest";

/*
 * `activation: "always"` (MODULES.md, "Activation"): a Module that is active in every Area it is
 * eligible for, that nobody selects, and whose id is never in a stored selection. The Asset Module is
 * the first, and the reason is the rule's whole use: every image picker in every Area opens its library.
 */

vi.mock("server-only", () => ({}));

import { PHI_CMS_AREA_KEYS } from "../../constants/cms-areas";
import type { PhiRuntimeModuleCatalogEntry, PhiRuntimeModuleDefinition } from "../../types/cms-plugins";
import { PHI_ASSET_CONTROLLER_TYPE } from "../../components/media/asset-controller-address";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./asset/ids";
import { createPhiDefaultAreaRuntimeModuleIds } from "./area-module-defaults";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";
import { resolvePhiRuntimeModuleSet } from "./resolver";
import {
  assertPhiRuntimeModuleIdsAllowedForArea,
  isPhiRuntimeModuleSelectable,
  listPhiAlwaysActiveRuntimeModuleIds,
  readPhiRuntimeModuleIdsForArea,
} from "./settings";

const catalog = PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG;
const definitions = [...catalog.values()].map((entry) => entry.definition);
const assetEntry = catalog.get(PHI_ASSET_RUNTIME_MODULE_ID)!;

/** The first-party catalog with one entry's definition replaced, as the catalog would be built with it. */
function catalogWith(
  moduleId: string,
  change: (definition: PhiRuntimeModuleDefinition) => PhiRuntimeModuleDefinition,
) {
  return () => createPhiRuntimeModuleCatalog(
    [...catalog.values()].map((entry): PhiRuntimeModuleCatalogEntry =>
      entry.definition.moduleId === moduleId ? { ...entry, definition: change(entry.definition) } : entry),
    catalog.areaDefinitions,
  );
}

describe("a Module declared activation: \"always\"", () => {
  it("is active in every Area it is eligible for, with nothing selected", async () => {
    expect(assetEntry.definition.activation).toBe("always");
    for (const area of PHI_CMS_AREA_KEYS) {
      expect(listPhiAlwaysActiveRuntimeModuleIds(area, definitions)).toContain(PHI_ASSET_RUNTIME_MODULE_ID);
      const moduleSet = await resolvePhiRuntimeModuleSet({ catalog, area, moduleIds: [], serverCapabilities: null });
      expect(moduleSet.activeModuleIds.has(PHI_ASSET_RUNTIME_MODULE_ID)).toBe(true);
    }
  });

  it("is in no Area's default selection, which a first save would otherwise be refused for", () => {
    for (const area of PHI_CMS_AREA_KEYS) {
      const defaults = createPhiDefaultAreaRuntimeModuleIds(area);
      expect(defaults).not.toContain(PHI_ASSET_RUNTIME_MODULE_ID);
      expect(() => assertPhiRuntimeModuleIdsAllowedForArea(area, defaults, definitions)).not.toThrow();
    }
  });

  it("is locked: not selectable, refused on write, read past in a list that still names it", () => {
    expect(isPhiRuntimeModuleSelectable(assetEntry.definition)).toBe(false);
    expect(() => assertPhiRuntimeModuleIdsAllowedForArea("admin", [PHI_ASSET_RUNTIME_MODULE_ID], definitions))
      .toThrow(/Locked runtime module/);
    expect(readPhiRuntimeModuleIdsForArea("admin", [PHI_ASSET_RUNTIME_MODULE_ID], definitions)).toEqual({
      moduleIds: [],
      unresolved: [{ moduleId: PHI_ASSET_RUNTIME_MODULE_ID, reason: "locked" }],
    });
  });

  it("is refused by the resolver when a caller selects it anyway", async () => {
    await expect(resolvePhiRuntimeModuleSet({
      catalog,
      area: "admin",
      moduleIds: [PHI_ASSET_RUNTIME_MODULE_ID],
      serverCapabilities: null,
    })).rejects.toThrow(/Locked runtime module/);
  });

  it("is not active where no Area is asked for", async () => {
    const moduleSet = await resolvePhiRuntimeModuleSet({ catalog, serverCapabilities: null });
    expect(moduleSet.activeModuleIds.has(PHI_ASSET_RUNTIME_MODULE_ID)).toBe(false);
  });

  it("mounts its Controller for nobody: the Area runs it only where something asks", async () => {
    expect(assetEntry.definition.controllerMountPolicy).toBe("demand");
    const moduleSet = await resolvePhiRuntimeModuleSet({ catalog, area: "public", moduleIds: [], serverCapabilities: null });
    expect(moduleSet.controllerDescriptorsByType.has(PHI_ASSET_CONTROLLER_TYPE)).toBe(true);
    expect(moduleSet.areaControllerSettings.map((setting) => setting.type)).not.toContain(PHI_ASSET_CONTROLLER_TYPE);
  });
});

describe("what the catalog accepts activation: \"always\" with", () => {
  it("accepts the first-party catalog as it is", () => {
    expect(catalogWith(PHI_ASSET_RUNTIME_MODULE_ID, (definition) => definition)).not.toThrow();
  });

  it("refuses a value it does not know", () => {
    expect(catalogWith(PHI_ASSET_RUNTIME_MODULE_ID, (definition) => ({
      ...definition,
      activation: "sometimes" as never,
    }))).toThrow(/activation must be "always" or absent/);
  });

  it("refuses it on an Area's Base Module", () => {
    expect(catalogWith(PHI_PUBLIC_RUNTIME_MODULE_ID, (definition) => ({ ...definition, activation: "always" })))
      .toThrow(/Base Module/);
  });

  it("refuses it on the Platform Module", () => {
    expect(catalogWith(catalog.platformModuleId!, (definition) => ({ ...definition, activation: "always" })))
      .toThrow(/Platform Module/);
  });

  it("refuses it on a Module of another package", () => {
    const foreignId = "@acme/gallery/modules/gallery" as PhiRuntimeModuleDefinition["moduleId"];
    expect(() => createPhiRuntimeModuleCatalog(
      [
        ...catalog.values(),
        {
          ...assetEntry,
          definition: {
            moduleId: foreignId,
            kind: "module",
            activation: "always",
            eligibleAreas: ["public"],
            serverBinding: assetEntry.definition.serverBinding,
            title: "Gallery",
            description: "A package that would switch itself on.",
            category: "media",
            iconFamily: "media",
          },
          widgets: [],
          layouts: [],
        } as PhiRuntimeModuleCatalogEntry,
      ],
      catalog.areaDefinitions,
    )).toThrow(/only a Module of @phis\/ui may declare activation "always"/);
  });

  it.each([
    ["mediaSpaces", { user: { kinds: ["image"] } }],
    ["threadKinds", []],
    ["seed", {}],
    ["userState", []],
  ] as const)("refuses it together with %s, which is derived from the stored selection", (key, value) => {
    expect(catalogWith(PHI_ASSET_RUNTIME_MODULE_ID, (definition) => ({ ...definition, [key]: value })))
      .toThrow(new RegExp(`must not declare ${key}`));
  });
});
