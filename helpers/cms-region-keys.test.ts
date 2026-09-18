import { describe, expect, it } from "vitest";

import {
  phiCmsRegionAcceptsWidget,
  resolvePhiCmsRegionOwnership,
} from "./cms-region-keys";

/**
 * Where a Widget may stand, asked of the Region rather than of the Widget's name.
 *
 * The two lists already existed and the Builder already used them to decide which workspace edits
 * what. What is pinned here is the question a Widget asks on top of that -- and the two answers that
 * are easy to get backwards: a Widget that asks for nothing goes anywhere, and a Region nobody
 * recognises is not a reason to hide a Widget from an author.
 */
describe("Region ownership", () => {
  it("names the shell Regions and the Page Regions apart", () => {
    expect(resolvePhiCmsRegionOwnership("sider_left")).toBe("shell");
    expect(resolvePhiCmsRegionOwnership("header_main")).toBe("shell");
    expect(resolvePhiCmsRegionOwnership("content")).toBe("page");
    expect(resolvePhiCmsRegionOwnership("header_bottom")).toBe("page");
  });

  it("knows nothing about a Region it was never told about", () => {
    expect(resolvePhiCmsRegionOwnership("gallery_strip")).toBeUndefined();
    expect(resolvePhiCmsRegionOwnership(undefined)).toBeUndefined();
  });

  it("lets a Widget that asks for nothing stand anywhere", () => {
    expect(phiCmsRegionAcceptsWidget("content", undefined)).toBe(true);
    expect(phiCmsRegionAcceptsWidget("sider_left", null)).toBe(true);
  });

  it("keeps a shell Widget out of a Page Region and admits it to the shell", () => {
    expect(phiCmsRegionAcceptsWidget("content", "shell")).toBe(false);
    expect(phiCmsRegionAcceptsWidget("header_bottom", "shell")).toBe(false);
    expect(phiCmsRegionAcceptsWidget("sider_left", "shell")).toBe(true);
  });

  it("admits a Widget to a Region it cannot place, rather than hiding it over a typo", () => {
    expect(phiCmsRegionAcceptsWidget("sider_lefft", "shell")).toBe(true);
    expect(phiCmsRegionAcceptsWidget(undefined, "shell")).toBe(true);
  });
});
