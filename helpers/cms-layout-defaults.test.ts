import { describe, expect, it } from "vitest";

import { PHI_LAYOUT_GAP, PHI_SPACE } from "../theme/antd-css-var-contract";
import { resolvePhiLayoutCreationPreset, resolvePhiLayoutDefaults } from "./cms-layout-defaults";

/* A Layout without a gap of its own takes the Theme's (THEME.md "Layout gap"). */

const GAPPED = ["flex", "verticalflex", "grid", "masonry", "threecol", "split"] as const;

describe("the Layout gap", () => {
  it("is the Theme's in the defaults of every Layout that has one", () => {
    for (const kind of GAPPED) {
      expect(resolvePhiLayoutDefaults(kind).gap, kind).toBe(PHI_LAYOUT_GAP);
    }
  });

  it("is not stated by a creation preset, so a new Layout follows the Theme", () => {
    for (const kind of GAPPED) {
      expect(resolvePhiLayoutCreationPreset(kind, "panel"), kind).not.toHaveProperty("gap");
    }
    expect(resolvePhiLayoutCreationPreset("verticalflex", "page-base")).not.toHaveProperty("gap");
  });

  it("stays closer on purpose in an Overlay's action row", () => {
    expect(resolvePhiLayoutCreationPreset("flex", "overlay-actions").gap).toBe(PHI_SPACE.xs);
  });
});

describe("an Overlay's action row", () => {
  it("ends its buttons the xs step from the dialog's right edge and keeps base on the left", () => {
    expect(resolvePhiLayoutCreationPreset("flex", "overlay-actions")).toMatchObject({
      paddingTop: PHI_SPACE.xs,
      paddingRight: PHI_SPACE.xs,
      paddingBottom: PHI_SPACE.xs,
      paddingLeft: PHI_SPACE.base,
    });
  });
});
