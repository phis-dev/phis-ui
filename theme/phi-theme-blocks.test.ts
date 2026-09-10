import { describe, expect, it } from "vitest";

import {
  PHI_CORE_THEME_GROUND_BLOCKS,
  PHI_CORE_THEME_GROUND_BLOCK_KEY,
  PHI_CORE_THEME_PALETTE_BLOCKS,
  PHI_CORE_THEME_SETS,
  PHI_CORE_THEME_STYLE_BLOCKS,
  PHI_CORE_THEME_STYLE_BLOCK_KEY,
  resolvePhiThemeBlock,
  resolvePhiThemeBlockSelection,
  resolvePhiThemeSetSelection,
} from "./phi-theme-blocks";

/**
 * A selection that cannot be resolved is the ordinary case, not a failure: a Module gets switched off
 * and the Site it dressed keeps running. What must survive is the selection itself, so switching the
 * Module back on is enough to have the look again.
 */
describe("theme block selection", () => {
  it("resolves a block that is available", () => {
    const resolved = resolvePhiThemeBlockSelection(
      PHI_CORE_THEME_STYLE_BLOCKS,
      "sharp",
      PHI_CORE_THEME_STYLE_BLOCK_KEY,
    );
    expect(resolved.block.key).toBe("sharp");
    expect(resolved.available).toBe(true);
    expect(resolved.requested).toBe("sharp");
  });

  it("falls back to the core block and keeps the selection readable", () => {
    const resolved = resolvePhiThemeBlockSelection(
      PHI_CORE_THEME_STYLE_BLOCKS,
      "@acme/ui/theme-styles/brutal",
      PHI_CORE_THEME_STYLE_BLOCK_KEY,
    );
    expect(resolved.block.key).toBe(PHI_CORE_THEME_STYLE_BLOCK_KEY);
    expect(resolved.available).toBe(false);
    expect(resolved.requested).toBe("@acme/ui/theme-styles/brutal");
  });

  it("treats an empty selection as no selection", () => {
    expect(resolvePhiThemeBlock(PHI_CORE_THEME_GROUND_BLOCKS, "  ", PHI_CORE_THEME_GROUND_BLOCK_KEY).key)
      .toBe(PHI_CORE_THEME_GROUND_BLOCK_KEY);
    expect(resolvePhiThemeBlock(PHI_CORE_THEME_GROUND_BLOCKS, null, PHI_CORE_THEME_GROUND_BLOCK_KEY).key)
      .toBe(PHI_CORE_THEME_GROUND_BLOCK_KEY);
  });

  it("throws only when the core block itself is missing", () => {
    expect(() => resolvePhiThemeBlock([], "phi", "phi")).toThrow(/missing from the core blocks/);
  });
});

/**
 * A Set points at three keys. Every key it names must exist in the core, or following a core Set would
 * silently land on the fallback.
 */
describe("core theme sets", () => {
  it("names blocks that exist", () => {
    for (const set of PHI_CORE_THEME_SETS) {
      expect(PHI_CORE_THEME_PALETTE_BLOCKS.some((block) => block.key === set.palette)).toBe(true);
      expect(PHI_CORE_THEME_STYLE_BLOCKS.some((block) => block.key === set.style)).toBe(true);
      expect(PHI_CORE_THEME_GROUND_BLOCKS.some((block) => block.key === set.ground)).toBe(true);
    }
  });

  it("resolves a set by key and falls back to the house set", () => {
    expect(resolvePhiThemeSetSelection(PHI_CORE_THEME_SETS, "forest").set.ground).toBe("forest");
    const missing = resolvePhiThemeSetSelection(PHI_CORE_THEME_SETS, "@acme/ui/theme-sets/neon");
    expect(missing.set.key).toBe("phi");
    expect(missing.available).toBe(false);
  });
});

/**
 * The core ground paints no picture. A guaranteed floor cannot depend on a file, because the case it
 * exists for is exactly the one where a package is gone.
 */
describe("core grounds", () => {
  it("keeps the fallback ground empty", () => {
    const plain = PHI_CORE_THEME_GROUND_BLOCKS.find((block) => block.key === "plain");
    expect(plain?.root).toEqual({});
  });

  it("states both modes wherever it states one", () => {
    for (const ground of PHI_CORE_THEME_GROUND_BLOCKS) {
      if (!ground.root.background) continue;
      expect(ground.root.background.light).toBeTruthy();
      expect(ground.root.background.dark).toBeTruthy();
      expect(ground.root.chrome?.light).toBeTruthy();
      expect(ground.root.chrome?.dark).toBeTruthy();
    }
  });

  it("carries no image base, in either mode", () => {
    for (const ground of PHI_CORE_THEME_GROUND_BLOCKS) {
      for (const mode of ["light", "dark"] as const) {
        expect(ground.root.background?.[mode]?.base?.kind).not.toBe("image");
        expect(ground.root.chrome?.[mode]?.base?.kind).not.toBe("image");
      }
    }
  });
});
