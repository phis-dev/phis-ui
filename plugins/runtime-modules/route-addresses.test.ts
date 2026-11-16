import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkPhiRouteAddresses } from "../../module-page-check";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { resolvePhiCmsDescriptorCatalog } from "./descriptor-compiler";

/** The address rule phis-ui asks of every package (THIRD_PARTY_MODULES.md, "Addresses and folders"), kept by its own routes. */
describe("first-party routes", () => {
  it("lie beneath no other route of their Area, a list's entries excepted", () => {
    const catalog = resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);
    const routes = [...catalog.routesByArea.values()].flatMap((declared) =>
      declared.map(({ descriptor }) => ({ area: descriptor.area, path: descriptor.path, presetKey: descriptor.presetKey })));
    expect(routes.length).toBeGreaterThan(0);
    expect(checkPhiRouteAddresses(routes)).toEqual([]);
  });
});
