import { describe, expect, it } from "vitest";

import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import type { PhiRuntimeModuleId } from "../../../types";
import {
  findPhiBuilderModuleAddressConflict,
  findPhiBuilderSitePageOnModulePackagePath,
} from "./page-address-rule";

const SHOP = "@acme/shop/modules/shop" as PhiRuntimeModuleId;

const catalog: PhiPresetPageNode[] = [
  { key: "cart", title: "Cart", storagePath: "/cart", sourcePreset: { ownerModuleId: SHOP, presetKey: "cart", sourcePresetVersion: 1 } },
  { key: "home", title: "Home", storagePath: "/", sourcePreset: { ownerModuleId: SHOP, presetKey: "home", sourcePresetVersion: 1 } },
  { key: "about", title: "About", storagePath: "/about" },
];

/*
 * A Site Page and a Module never share an address (PUBLIC_ADDRESSES.md section 1). In Public the
 * Module's address is its route; elsewhere it is the package path, which is the Module's identity.
 */
describe("a Site Page against the addresses of active Modules", () => {
  it("refuses a Page on, or beneath, an active Module's Public route", () => {
    const input = { area: "public", activeModuleIds: [SHOP], catalog };
    expect(findPhiBuilderModuleAddressConflict("/cart", input)).toEqual({ moduleId: SHOP, path: "/cart", base: false });
    expect(findPhiBuilderModuleAddressConflict("/cart/extra", input)?.path).toBe("/cart");
    expect(findPhiBuilderModuleAddressConflict("/contact", input)).toBeNull();
  });

  it("says a built-in Page is edited where it is rather than replaced", () => {
    const conflict = findPhiBuilderModuleAddressConflict("/cart", { area: "public", activeModuleIds: [SHOP], catalog, baseModuleId: SHOP });
    expect(conflict?.base).toBe(true);
  });

  it("asks nothing of a Module that is not active, nor of the Area root", () => {
    expect(findPhiBuilderModuleAddressConflict("/cart", { area: "public", activeModuleIds: [], catalog })).toBeNull();
    expect(findPhiBuilderModuleAddressConflict("/", { area: "public", activeModuleIds: [SHOP], catalog })).toBeNull();
  });

  it("refuses a Page under the package path outside Public", () => {
    const input = { area: "app", activeModuleIds: [SHOP], catalog };
    expect(findPhiBuilderModuleAddressConflict("/acme/shop/orders", input)?.path).toBe("/acme/shop");
    // A Page above the package path would make the Module lie beneath a Page: a Page is never a folder.
    expect(findPhiBuilderModuleAddressConflict("/acme", input)?.path).toBe("/acme/shop");
    expect(findPhiBuilderModuleAddressConflict("/acme-news", input)).toBeNull();
  });

  it("names the Site Page that keeps a Module from being activated outside Public", () => {
    expect(findPhiBuilderSitePageOnModulePackagePath(SHOP, ["/about", "/acme/shop"]))
      .toEqual({ prefix: "/acme/shop", path: "/acme/shop" });
    expect(findPhiBuilderSitePageOnModulePackagePath(SHOP, ["/about", "/acme/shopping"])).toBeNull();
  });
});
