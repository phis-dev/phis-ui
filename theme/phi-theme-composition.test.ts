import { describe, expect, it } from "vitest";

import {
  PHI_CORE_THEME_BLOCK_CATALOG,
  readPhiThemeBlockSelection,
  resolvePhiThemeComposition,
  resolvePhiThemeEffectiveFonts,
  resolvePhiThemeEffectiveRoot,
} from "./phi-theme-composition";
import { PHI_CORE_THEME_FONTS_BLOCKS, PHI_CORE_THEME_GROUND_BLOCKS, type PhiThemeFontsBlock } from "./phi-theme-blocks";

const groundOf = (key: string) => {
  const block = PHI_CORE_THEME_GROUND_BLOCKS.find((candidate) => candidate.key === key);
  if (!block) throw new Error(`No core ground "${key}".`);
  return block;
};

/**
 * A Theme written before the split names one preset, and that preset was the palette. Reading it that
 * way is the whole migration, so a Site nobody opens keeps rendering as it did.
 */
describe("theme block selection", () => {
  it("reads the old single preset as the palette", () => {
    const selection = readPhiThemeBlockSelection({ preset: "phis", presetVersion: 1 });
    expect(selection.palette).toBe("phis");
    expect(selection.style).toBeNull();
    expect(selection.ground).toBeNull();
  });

  it("fills the parts a Set names", () => {
    const selection = readPhiThemeBlockSelection({ blocks: { set: { key: "phis" } } });
    expect(selection).toEqual({ set: "phis", palette: "phis", style: "phis", ground: "phis", fonts: "phis" });
  });

  it("lets an explicit part win over the Set it follows", () => {
    const selection = readPhiThemeBlockSelection({
      blocks: { set: { key: "phis" }, ground: { key: "@acme/ui/grounds/dunes" } },
    });
    expect(selection.palette).toBe("phis");
    expect(selection.ground).toBe("@acme/ui/grounds/dunes");
  });

  it("ignores a Set that names nothing available", () => {
    const selection = readPhiThemeBlockSelection({ blocks: { set: { key: "@acme/ui/sets/neon" } } });
    expect(selection.set).toBe("@acme/ui/sets/neon");
    expect(selection.palette).toBeNull();
  });
});

/**
 * Switching off the Module that shipped one block must not take the others with it, and the workspace
 * has to be able to say which part is running on the core rather than on what somebody chose.
 */
describe("theme composition", () => {
  it("resolves each part on its own", () => {
    const composition = resolvePhiThemeComposition({
      blocks: { palette: { key: "phis" }, ground: { key: "@acme/ui/grounds/dunes" } },
    });
    expect(composition.palette.key).toBe("phis");
    expect(composition.ground.key).toBe("phis");
    expect(composition.unavailable.ground).toBe("@acme/ui/grounds/dunes");
    expect(composition.unavailable.palette).toBeNull();
  });

  it("reports an unavailable Set without losing the parts it could resolve", () => {
    const composition = resolvePhiThemeComposition({
      blocks: { set: { key: "@acme/ui/sets/neon" }, palette: { key: "phis" } },
    });
    expect(composition.unavailable.set).toBe("@acme/ui/sets/neon");
    expect(composition.set).toBeNull();
    expect(composition.palette.key).toBe("phis");
  });

  it("lands on the core blocks when a Theme names nothing", () => {
    const composition = resolvePhiThemeComposition(null, PHI_CORE_THEME_BLOCK_CATALOG);
    expect(composition.palette.key).toBe("phis");
    expect(composition.style.key).toBe("phis");
    expect(composition.ground.key).toBe("phis");
    expect(composition.fonts.key).toBe("phis");
  });

  it("resolves the fonts block a Set names, and reports one that is gone", () => {
    const catalog = {
      ...PHI_CORE_THEME_BLOCK_CATALOG,
      fonts: [...PHI_CORE_THEME_FONTS_BLOCKS, { key: "@acme/ui/fonts/dunes", version: 1, title: "Dunes", fonts: { body: "Mulish", display: "Marcellus" } }],
      sets: [...PHI_CORE_THEME_BLOCK_CATALOG.sets, { key: "@acme/ui/sets/dunes", version: 1, title: "Dunes", palette: "phis", style: "phis", ground: "phis", fonts: "@acme/ui/fonts/dunes" }],
    };
    expect(resolvePhiThemeComposition({ blocks: { set: { key: "@acme/ui/sets/dunes" } } }, catalog).fonts.fonts.display).toBe("Marcellus");
    const gone = resolvePhiThemeComposition({ blocks: { fonts: { key: "@acme/ui/fonts/dunes" } } });
    expect(gone.fonts.key).toBe("phis");
    expect(gone.unavailable.fonts).toBe("@acme/ui/fonts/dunes");
  });
});

/**
 * Slot by slot, like the ground mode by mode: the author's body face survives a block that changes its
 * display face, and a cleared slot shows the block rather than naming nothing.
 */
describe("effective fonts", () => {
  const block: PhiThemeFontsBlock = { key: "@acme/ui/fonts/dunes", version: 1, title: "Dunes", fonts: { body: "Mulish", display: "Marcellus", mono: "Fira Mono" } };

  it("takes the block's families where nothing was authored", () => {
    expect(resolvePhiThemeEffectiveFonts(null, block)).toEqual({ body: "Mulish", display: "Marcellus", mono: "Fira Mono" });
  });

  it("keeps the author's slot and fills the rest from the block", () => {
    expect(resolvePhiThemeEffectiveFonts({ body: "Inter" }, block)).toEqual({ body: "Inter", display: "Marcellus", mono: "Fira Mono" });
  });

  it("reads an empty slot as no choice", () => {
    expect(resolvePhiThemeEffectiveFonts({ body: "  ", display: "" }, block).body).toBe("Mulish");
  });
});

/**
 * The author's values win, part by part. A whole-object merge would let the dark mode somebody never
 * opened vanish the moment they edited the light one.
 */
describe("effective root", () => {
  const ground = groundOf("phis");

  it("keeps the block's other mode when one mode is authored", () => {
    const effective = resolvePhiThemeEffectiveRoot(
      { background: { light: { base: { kind: "color", color: "#ff0000" } } } },
      ground,
    );
    expect(effective.background?.light?.base).toEqual({ kind: "color", color: "#ff0000" });
    expect(effective.background?.dark?.base?.kind).toBe("image");
  });

  it("honours an explicit none over the block's ground", () => {
    const effective = resolvePhiThemeEffectiveRoot(
      { background: { light: { base: { kind: "none" } } } },
      ground,
    );
    expect(effective.background?.light?.base).toEqual({ kind: "none" });
  });

  it("takes the block's ground where nothing was authored", () => {
    const effective = resolvePhiThemeEffectiveRoot(null, ground);
    expect(effective.background?.light?.base?.kind).toBe("image");
    expect(effective.chrome?.light?.effect).toBe("glass");
    expect(effective.chrome?.shadow?.header).toBe("soft");
  });

  it("merges the Shadow one family at a time", () => {
    const effective = resolvePhiThemeEffectiveRoot(
      { chrome: { shadow: { header: "strong" } } },
      ground,
    );
    expect(effective.chrome?.shadow?.header).toBe("strong");
    expect(effective.chrome?.shadow?.footer).toBe("soft");
  });

  it("paints nothing for a ground that states nothing", () => {
    const effective = resolvePhiThemeEffectiveRoot(null, { key: "@acme/ui/grounds/bare", version: 1, title: "Bare", root: {} });
    expect(effective.background?.light).toBeNull();
    expect(effective.chrome?.dark).toBeNull();
    expect(effective.chrome?.shadow).toBeUndefined();
  });
});
