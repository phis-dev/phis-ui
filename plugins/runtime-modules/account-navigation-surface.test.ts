import { describe, expect, it } from "vitest";

import { PHI_CMS_AREA_KEYS } from "../../constants/cms-areas";
import type { PhiCmsAreaDefinition } from "../../types/cms-module-descriptors";
import { PHI_ALL_RUNTIME_AREA_DEFINITIONS } from "./area-definitions";

/**
 * The account menu a Module may contribute to, in every Area that draws one.
 *
 * The same Account Widget stands in all six shells, and it resolves `<area>:account` to find what
 * Modules put there. Four Areas declared no such surface, so a contribution was resolved to nothing and
 * disappeared without a word -- the Avatar Module's entry was in the App menu and missing from the
 * identical menu in the Admin, for no reason a reader of either could see.
 *
 * The anchor matters as much as the surface: a Module docks under an exported item key and nowhere else,
 * which is what keeps the shape of the menu the Area's decision rather than the contributor's.
 */

/*
 * Read through the contract rather than through the literals. The definitions are written with
 * `satisfies`, so each one keeps its own narrow shape and asking a union of them for `routePresetKey`
 * asks members that have none. What is being asserted is a property of the descriptor type anyway.
 */
const areaDefinitions: readonly PhiCmsAreaDefinition[] = PHI_ALL_RUNTIME_AREA_DEFINITIONS;

describe("the account menu surface", () => {
  it("is declared by every Area, with an anchor a Module can dock under", () => {
    for (const area of PHI_CMS_AREA_KEYS) {
      const definition = areaDefinitions.find(
        (candidate) => candidate.area === area,
      );
      expect(definition, `Area "${area}" has a runtime definition`).toBeDefined();

      const surface = definition?.navigationSurfaces?.find(
        (candidate) => candidate.navKey === `${area}:account`,
      );
      expect(surface, `Area "${area}" declares a ${area}:account surface`).toBeDefined();

      const anchorKeys = surface?.items.map((item) => item.itemKey) ?? [];
      expect(anchorKeys.length).toBe(1);
      expect(surface?.exportedItemKeys ?? []).toEqual(anchorKeys);
    }
  });

  it("offers the anchor as a place to dock and not as a destination", () => {
    // Rendering it would put a label in the menu that leads nowhere; only its children are entries.
    for (const definition of areaDefinitions) {
      const surface = definition.navigationSurfaces?.find(
        (candidate) => candidate.navKey === `${definition.area}:account`,
      );
      for (const item of surface?.items ?? []) {
        expect(item.routePresetKey).toBeUndefined();
        expect(item.overlayPresetKey).toBeUndefined();
      }
    }
  });
});
