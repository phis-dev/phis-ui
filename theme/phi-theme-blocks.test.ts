import { describe, expect, it } from "vitest";

import {
  PHI_CORE_THEME_FONTS_BLOCKS,
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
      PHI_CORE_THEME_GROUND_BLOCKS,
      "phis",
      PHI_CORE_THEME_GROUND_BLOCK_KEY,
    );
    expect(resolved.block.key).toBe("phis");
    expect(resolved.available).toBe(true);
    expect(resolved.requested).toBe("phis");
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
    expect(() => resolvePhiThemeBlock([], "phis", "phis")).toThrow(/missing from the core blocks/);
  });
});

/**
 * A Set points at four keys. Every key it names must exist in the core, or following a core Set would
 * silently land on the fallback.
 */
describe("core theme sets", () => {
  it("names blocks that exist", () => {
    for (const set of PHI_CORE_THEME_SETS) {
      expect(PHI_CORE_THEME_PALETTE_BLOCKS.some((block) => block.key === set.palette)).toBe(true);
      expect(PHI_CORE_THEME_STYLE_BLOCKS.some((block) => block.key === set.style)).toBe(true);
      expect(PHI_CORE_THEME_GROUND_BLOCKS.some((block) => block.key === set.ground)).toBe(true);
      expect(PHI_CORE_THEME_FONTS_BLOCKS.some((block) => block.key === set.fonts)).toBe(true);
    }
  });

  it("resolves a set by key and falls back to the house set", () => {
    expect(resolvePhiThemeSetSelection(PHI_CORE_THEME_SETS, "phis").set.ground).toBe("phis");
    const missing = resolvePhiThemeSetSelection(PHI_CORE_THEME_SETS, "@acme/ui/theme-sets/neon");
    expect(missing.set.key).toBe("phis");
    expect(missing.available).toBe(false);
  });
});

/**
 * The core ground depends on nothing that can go missing. A guaranteed floor cannot rest on a file or
 * an Asset, because the case it exists for is exactly the one where a package is gone; a picture it
 * carries inline is code, and allowed.
 */
describe("core grounds", () => {
  it("ships exactly one, the house ground", () => {
    expect(PHI_CORE_THEME_GROUND_BLOCKS.map((block) => block.key)).toEqual([PHI_CORE_THEME_GROUND_BLOCK_KEY]);
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

  it("carries any picture inline, never as a file or an Asset", () => {
    for (const ground of PHI_CORE_THEME_GROUND_BLOCKS) {
      for (const mode of ["light", "dark"] as const) {
        for (const base of [ground.root.background?.[mode]?.base, ground.root.chrome?.[mode]?.base]) {
          if (base?.kind !== "image") continue;
          expect(base.sourceKind).toBe("url");
          expect("sourceUrl" in base && (base.sourceUrl ?? "").startsWith("data:image/")).toBe(true);
        }
      }
    }
  });
});
