import { describe, expect, it } from "vitest";

import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import { findPhiBuilderSitePageAddressConflict } from "./page-address-rule";

const catalog: PhiPresetPageNode[] = [
  { key: "/", title: "Home", storagePath: "/" },
  { key: "about", title: "About", storagePath: "/about" },
  { key: "docs", title: "Docs", children: [{ key: "docs/guide", title: "Guide", storagePath: "/docs/guide" }] },
  {
    key: "preset-login",
    title: "Login",
    storagePath: "/login",
    sourcePreset: { ownerModuleId: "@phis/ui/modules/auth", presetKey: "login", sourcePresetVersion: 1 },
  },
];

describe("findPhiBuilderSitePageAddressConflict", () => {
  it("allows a free path, including one inside a folder", () => {
    expect(findPhiBuilderSitePageAddressConflict("/contact", catalog)).toBeNull();
    expect(findPhiBuilderSitePageAddressConflict("/docs/api", catalog)).toBeNull();
  });

  it("reports a path another Site Page holds", () => {
    expect(findPhiBuilderSitePageAddressConflict("/about/", catalog)).toEqual({ kind: "collision", path: "/about" });
  });

  it("refuses a path beneath a Site Page, and one that would hold a Site Page beneath it", () => {
    expect(findPhiBuilderSitePageAddressConflict("/about/team", catalog)).toEqual({ kind: "nested", path: "/about" });
    expect(findPhiBuilderSitePageAddressConflict("/docs", catalog)).toEqual({ kind: "nested", path: "/docs/guide" });
  });

  it("does not treat the Area root, a shared prefix, or a Module Page as a folder", () => {
    expect(findPhiBuilderSitePageAddressConflict("/aboutus", catalog)).toBeNull();
    expect(findPhiBuilderSitePageAddressConflict("/login/help", catalog)).toBeNull();
  });

  it("ignores the Page's own address when it is moved", () => {
    expect(findPhiBuilderSitePageAddressConflict("/docs/guide", catalog, { exceptPath: "/docs/guide" })).toBeNull();
  });
});
