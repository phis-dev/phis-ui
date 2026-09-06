import { describe, expect, it } from "vitest";

import {
  createPhiPresetCmsInstanceId,
  createPhiPresetCmsPageId,
  isPhiCmsInstanceId,
  readPhiCmsInstanceIdDescriptor,
} from "./cms-instance-id";

/**
 * How the Builder addresses a Page.
 *
 * The pair a Module Page is stored under, hashed. It is recomputable rather than allocated, so no row
 * has to exist before a Page can be opened, and it says nothing about where the Page answers -- which is
 * the whole point: reassigning a path must leave the drafts hanging off that Page exactly where they are.
 */

const ADMIN = "@phis/ui/modules/admin" as const;
const SHOP = "@acme/shop/modules/shop" as const;

describe("a Page id", () => {
  it("is the same id every time, without anything being stored", () => {
    const first = createPhiPresetCmsPageId({ ownerModuleId: ADMIN, presetKey: "admin-users-page" });
    const second = createPhiPresetCmsPageId({ ownerModuleId: ADMIN, presetKey: "admin-users-page" });
    expect(first).toBe(second);
    expect(isPhiCmsInstanceId(first)).toBe(true);
    expect(readPhiCmsInstanceIdDescriptor(first)).toMatchObject({ origin: "preset", domain: "page" });
  });

  it("separates two Modules that chose the same word", () => {
    // The collision the old bare page key made into a catalog-wide failure.
    expect(createPhiPresetCmsPageId({ ownerModuleId: ADMIN, presetKey: "dashboard" }))
      .not.toBe(createPhiPresetCmsPageId({ ownerModuleId: SHOP, presetKey: "dashboard" }));
  });

  it("is not a node id of the same preset", () => {
    // A Page and a node inside it are different things and must not answer to one another's id.
    expect(createPhiPresetCmsPageId({ ownerModuleId: ADMIN, presetKey: "admin-users-page" }))
      .not.toBe(createPhiPresetCmsInstanceId({
        domain: "page",
        ownerModuleId: ADMIN,
        presetKey: "admin-users-page",
        nodeKey: "hero",
      }));
  });
});
