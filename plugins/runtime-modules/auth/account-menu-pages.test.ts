import { describe, expect, it } from "vitest";

import { createPhiAppRuntimeModuleCatalog } from "../area-catalogs/app";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import type { PhiCmsResolvedNavigationItem, PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";

/**
 * The Pages the account menu offers, against the routes that answer them.
 *
 * They used to be two paths in the Auth Module's UI projection, and the address a Module writes for
 * itself is not the address its Page is served at -- outside Public a Module's routes live under its
 * package. The Widget put only the Area in front and offered `/app/settings/security` for a Page that
 * answers at `/app/phis/ui/settings/security`, so the entry led nowhere.
 *
 * They are ordinary navigation entries now, and an entry names a route preset rather than a path: the
 * address is whatever the Area's route table says, and the two cannot drift apart because there is only
 * one of them. What is pinned here is that the entries exist where the menu looks for them -- under the
 * one anchor of `app:account` -- and that each names a route this Area actually serves.
 */

const APP_ACCOUNT_NAV_KEY = "app:account";

function appAccountSurfaceItems() {
  const entries = createPhiAppRuntimeModuleCatalog();
  const activeModuleIds = new Set<PhiRuntimeModuleId>([...entries.keys()]);
  const catalog = resolvePhiCmsDescriptorCatalog(entries);
  const surfaces = resolvePhiCmsActiveNavigationSurfaces({ catalog, area: "app", activeModuleIds });
  const surface = surfaces.find((candidate) => candidate.navKey === APP_ACCOUNT_NAV_KEY);
  expect(surface, `the App declares a ${APP_ACCOUNT_NAV_KEY} surface`).toBeDefined();

  // The menu renders the anchor's children, which is where both account Pages hang.
  const anchor = surface!.items.find((item) => item.children.length > 0);
  return {
    items: anchor?.children ?? [],
    routeTable: compilePhiCmsActiveRouteTable({ catalog, area: "app", activeModuleIds }),
  };
}

function targetPresetKeys(items: readonly PhiCmsResolvedNavigationItem[]) {
  return items.flatMap((item) =>
    item.target?.kind === "module" ? [item.target.presetKey] : []);
}

describe("the account menu's own Pages", () => {
  it("offers the profile and account security as entries of the App account surface", () => {
    const { items } = appAccountSurfaceItems();

    expect(targetPresetKeys(items)).toEqual(
      expect.arrayContaining(["app-profile-page", "app-auth-security-page"]),
    );
  });

  it("names routes the App serves, under the package the Module's Pages live in", () => {
    const { items, routeTable } = appAccountSurfaceItems();

    for (const presetKey of ["app-profile-page", "app-auth-security-page"]) {
      expect(targetPresetKeys(items)).toContain(presetKey);
    }

    // The addresses themselves: Module-relative on the left, as declared; served on the right.
    expect(resolvePhiCmsRoutePreset(routeTable, "/settings/profile")).toBeNull();
    expect(resolvePhiCmsRoutePreset(routeTable, "/settings/security")).toBeNull();
    expect(
      resolvePhiCmsRoutePreset(routeTable, "/phis/ui/settings/profile")?.descriptor.presetKey,
    ).toBe("app-profile-page");
    expect(
      resolvePhiCmsRoutePreset(routeTable, "/phis/ui/settings/security")?.descriptor.presetKey,
    ).toBe("app-auth-security-page");
  });
});
