import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkPhiRouteAddresses } from "../../module-page-check";
import { listPhiCatalogRouteAddressSubjects, refusePhiCatalogRouteAddresses } from "../../helpers/route-address-check";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { resolvePhiCmsDescriptorCatalog } from "./descriptor-compiler";

/** The address rule phis-ui asks of every package (THIRD_PARTY_MODULES.md, "Addresses and folders"), kept by its own routes. */
describe("first-party routes", () => {
  it("lie beneath no other route of their Area, a list's entries excepted", () => {
    const catalog = resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);
    const routes = listPhiCatalogRouteAddressSubjects(catalog.routesByArea);
    expect(routes.length).toBeGreaterThan(0);
    expect(checkPhiRouteAddresses(routes)).toEqual([]);
    expect(() => refusePhiCatalogRouteAddresses(catalog.routesByArea)).not.toThrow();
  });

  it("are refused, as a compiled catalog, where one package's route lies beneath another's", () => {
    const route = (presetKey: string, path: string) => ({ descriptor: { area: "public" as const, path, presetKey } });
    const routesByArea = new Map([["public" as const, [route("docs", "/docs"), route("docs-api", "/docs/api"), route("blog-entry", "/blog/:slug"), route("blog", "/blog")]]]);
    expect(() => refusePhiCatalogRouteAddresses(routesByArea)).toThrow(/"\/docs\/api" lies beneath "\/docs"/u);
    expect(() => refusePhiCatalogRouteAddresses(new Map([["public" as const, [route("blog", "/blog"), route("blog-entry", "/blog/:slug")]]]))).not.toThrow();
  });
});
