import { describe, expect, it } from "vitest";

import { PHI_CMS_AREA_KEYS } from "../../constants/cms-areas";
import type { PhiCmsAreaDefinition } from "../../types/cms-module-descriptors";
import { PHI_ALL_RUNTIME_AREA_DEFINITIONS } from "./area-definitions";

/**
 * The account menu every Area draws, and the one thing every Area must offer in it.
 *
 * The same Account Widget stands in all six shells. Four Areas declared no `<area>:account` surface at
 * all, so a Module's contribution was resolved to nothing and disappeared without a word -- the Avatar
 * entry was in the App menu and missing from the identical menu in the Admin.
 *
 * Signing out is the Area's own entry and not the Auth Module's, because the Editor and the Accounting
 * Area have no Auth Module in their catalogs and a person standing in one of them still has a session
 * to end. It sends rather than goes: a session belongs to the account on this Site, so the signal is
 * Site-scoped and the runtime performs it through the auth door every Site mounts.
 */

/*
 * Read through the contract rather than through the literals. The definitions are written with
 * `satisfies`, so each one keeps its own narrow shape and asking a union of them for `routePresetKey`
 * asks members that have none. What is being asserted is a property of the descriptor type anyway.
 */
const areaDefinitions: readonly PhiCmsAreaDefinition[] = PHI_ALL_RUNTIME_AREA_DEFINITIONS;

function accountSurfaceOf(definition: PhiCmsAreaDefinition) {
  return definition.navigationSurfaces?.find(
    (candidate) => candidate.navKey === `${definition.area}:account`,
  );
}

describe("the account menu surface", () => {
  it("is declared by every Area, with one anchor a Module can dock under", () => {
    for (const area of PHI_CMS_AREA_KEYS) {
      const definition = areaDefinitions.find((candidate) => candidate.area === area);
      expect(definition, `Area "${area}" has a runtime definition`).toBeDefined();

      const surface = definition && accountSurfaceOf(definition);
      expect(surface, `Area "${area}" declares a ${area}:account surface`).toBeDefined();

      const exported = surface?.exportedItemKeys ?? [];
      expect(exported.length, `Area "${area}" exports exactly one account anchor`).toBe(1);
      expect(surface?.items.map((item) => item.itemKey)).toContain(exported[0]);
    }
  });

  it("offers the anchor as a place to dock and not as a destination", () => {
    // Rendering it would put a label in the menu that leads nowhere; only its children are entries.
    for (const definition of areaDefinitions) {
      const surface = accountSurfaceOf(definition);
      const anchorKey = surface?.exportedItemKeys?.[0];
      const anchor = surface?.items.find((item) => item.itemKey === anchorKey);
      expect(anchor?.routePresetKey).toBeUndefined();
      expect(anchor?.overlayPresetKey).toBeUndefined();
      expect(anchor?.signalRoutes).toBeUndefined();
    }
  });

  it("lets a signed-in visitor sign out of every Area", () => {
    for (const definition of areaDefinitions) {
      const surface = accountSurfaceOf(definition);
      const signOut = surface?.items.find((item) => item.signalRoutes?.emits?.length);
      expect(signOut, `Area "${definition.area}" offers a way out`).toBeDefined();

      // It sends and does not go: there is no Page that ends a session.
      expect(signOut?.routePresetKey).toBeUndefined();
      expect(signOut?.accessPolicy).toBeDefined();

      const routes = signOut?.signalRoutes?.emits ?? [];
      expect(routes.length).toBe(1);
      // Site scope, because a session is the account's on this Site and not the Area's.
      expect(routes[0]?.scope).toBe("site");
      expect(routes[0]?.channel).toBe("session");
      expect(routes[0]?.action).toBe("clear");
      expect(routes[0]?.valueType).toBe("none");
    }
  });
});
