import { describe, expect, it } from "vitest";

import { createPhiPublicRuntimeModuleCatalog } from "./area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
  resolvePhiCmsRoutePresetByPageId,
} from "./descriptor-compiler";
import { PHI_AUTH_PUBLIC_LOGIN_ROUTE_PRESET_KEY, PHI_AUTH_RUNTIME_MODULE_ID } from "./auth/ids";
import { createPhiPresetCmsPageId } from "../../types/cms-instance-id";
import { PHI_PUBLIC_LOGIN_ROUTE_IDENTITY } from "../../constants/public-login-route";
import { readPhiCmsNavigationTargetPath } from "../../helpers/navigation-target";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";

/**
 * A Public route answering where the Site said, not where the Module wrote.
 *
 * The assignment is a value in the Area's config rather than something baked into the catalog, so the
 * same installed Module answers on different addresses on two Sites. This pins the two halves of that:
 * the new address answers, and the declared one stops.
 */

const catalogEntries = createPhiPublicRuntimeModuleCatalog();
const catalog = resolvePhiCmsDescriptorCatalog(catalogEntries);
const activeModuleIds = new Set<PhiRuntimeModuleId>([
  ...catalogEntries.keys(),
]);

function compile(publicRoutePaths: { ownerModuleId: PhiRuntimeModuleId; presetKey: string; path: string }[]) {
  return compilePhiCmsActiveRouteTable({
    catalog,
    area: "public",
    activeModuleIds,
    publicRoutePaths,
  });
}

describe("an assigned Public address", () => {
  const loginPreset = [...(catalog.routesByArea.get("public") ?? [])]
    .find((pattern) => pattern.descriptor.path === "/login")?.descriptor;

  it("has a declared address to move", () => {
    expect(loginPreset?.ownerModuleId).toBe(PHI_AUTH_RUNTIME_MODULE_ID);
  });

  it("answers where the Site assigned it", () => {
    const table = compile([{
      ownerModuleId: loginPreset!.ownerModuleId,
      presetKey: loginPreset!.presetKey,
      path: "/sign-in",
    }]);
    expect(resolvePhiCmsRoutePreset(table, "/sign-in")?.descriptor.presetKey).toBe(loginPreset!.presetKey);
    expect(resolvePhiCmsRoutePreset(table, "/login")).toBeNull();
  });

  it("keeps the Page identity it had, which is why the assignment can be made at all", () => {
    const before = compile([]);
    const after = compile([{
      ownerModuleId: loginPreset!.ownerModuleId,
      presetKey: loginPreset!.presetKey,
      path: "/sign-in",
    }]);
    expect([...after.byPageId.keys()]).toEqual([...before.byPageId.keys()]);
  });

  it("is the Page the access guard looks up, under the key it was given", () => {
    expect(loginPreset!.presetKey).toBe(PHI_AUTH_PUBLIC_LOGIN_ROUTE_PRESET_KEY);
    expect(loginPreset!.ownerModuleId).toBe(PHI_PUBLIC_LOGIN_ROUTE_IDENTITY.ownerModuleId);
    const table = compile([{
      ownerModuleId: loginPreset!.ownerModuleId,
      presetKey: loginPreset!.presetKey,
      path: "/sign-in",
    }]);
    const pageId = createPhiPresetCmsPageId({
      ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
      presetKey: PHI_AUTH_PUBLIC_LOGIN_ROUTE_PRESET_KEY,
    });
    expect(resolvePhiCmsRoutePresetByPageId(table, pageId)?.descriptor.path).toBe("/sign-in");
  });

  /*
   * The header entry has to follow the address, or the Site has a link to its own 404 the day after it
   * moved registration. The entry is resolved through the table and not through the catalog, which is
   * the same statement for every link to a Module Page.
   */
  it("is what the navigation entry links, not the declared address", () => {
    const registration = [...(catalog.routesByArea.get("public") ?? [])]
      .find((pattern) => pattern.descriptor.path === "/register")?.descriptor;
    expect(registration?.ownerModuleId).toBe(PHI_AUTH_RUNTIME_MODULE_ID);
    const table = compile([{
      ownerModuleId: registration!.ownerModuleId,
      presetKey: registration!.presetKey,
      path: "/signup",
    }]);
    const header = resolvePhiCmsActiveNavigationSurfaces({
      catalog,
      area: "public",
      activeModuleIds,
      routeTable: table,
    }).find((surface) => surface.navKey === "public:header");
    const entry = header?.items.find((item) =>
      item.target?.kind === "module" && item.target.presetKey === registration!.presetKey);
    expect(readPhiCmsNavigationTargetPath(entry?.target ?? null)).toBe("/signup");
  });

  it("ignores an entry for a route that is not there", () => {
    const table = compile([{
      ownerModuleId: "@acme/nothing/modules/gone" as PhiRuntimeModuleId,
      presetKey: "gone-page",
      path: "/gone",
    }]);
    expect(resolvePhiCmsRoutePreset(table, "/gone")).toBeNull();
    expect(resolvePhiCmsRoutePreset(table, "/login")?.descriptor.presetKey).toBe(loginPreset!.presetKey);
  });
});
