import { describe, expect, it } from "vitest";

import {
  PHI_CORE_THEME_BLOCK_CATALOG,
  readPhiThemeBlockSelection,
  resolvePhiThemeComposition,
  resolvePhiThemeEffectiveRoot,
} from "./phi-theme-composition";
import { PHI_CORE_THEME_GROUND_BLOCKS } from "./phi-theme-blocks";

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
    const selection = readPhiThemeBlockSelection({ preset: "forest", presetVersion: 1 });
    expect(selection.palette).toBe("forest");
    expect(selection.style).toBeNull();
    expect(selection.ground).toBeNull();
  });

  it("fills the parts a Set names", () => {
    const selection = readPhiThemeBlockSelection({ blocks: { set: { key: "sea" } } });
    expect(selection).toEqual({ set: "sea", palette: "sea", style: "phi", ground: "sea" });
  });

  it("lets an explicit part win over the Set it follows", () => {
    const selection = readPhiThemeBlockSelection({
      blocks: { set: { key: "sea" }, ground: { key: "forest" } },
    });
    expect(selection.palette).toBe("sea");
    expect(selection.ground).toBe("forest");
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
      blocks: { palette: { key: "forest" }, ground: { key: "@acme/ui/grounds/dunes" } },
    });
    expect(composition.palette.key).toBe("forest");
    expect(composition.ground.key).toBe("plain");
    expect(composition.unavailable.ground).toBe("@acme/ui/grounds/dunes");
    expect(composition.unavailable.palette).toBeNull();
  });

  it("reports an unavailable Set without losing the parts it could resolve", () => {
    const composition = resolvePhiThemeComposition({
      blocks: { set: { key: "@acme/ui/sets/neon" }, palette: { key: "sea" } },
    });
    expect(composition.unavailable.set).toBe("@acme/ui/sets/neon");
    expect(composition.set).toBeNull();
    expect(composition.palette.key).toBe("sea");
  });

  it("lands on the core blocks when a Theme names nothing", () => {
    const composition = resolvePhiThemeComposition(null, PHI_CORE_THEME_BLOCK_CATALOG);
    expect(composition.palette.key).toBe("phi");
    expect(composition.style.key).toBe("phi");
    expect(composition.ground.key).toBe("plain");
  });
});

/**
 * The author's values win, part by part. A whole-object merge would let the dark mode somebody never
 * opened vanish the moment they edited the light one.
 */
describe("effective root", () => {
  const ground = groundOf("forest");

  it("keeps the block's other mode when one mode is authored", () => {
    const effective = resolvePhiThemeEffectiveRoot(
      { background: { light: { base: { kind: "color", color: "#ff0000" } } } },
      ground,
    );
    expect(effective.background?.light?.base).toEqual({ kind: "color", color: "#ff0000" });
    expect(effective.background?.dark?.base?.kind).toBe("gradient");
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
    expect(effective.background?.light?.base?.kind).toBe("gradient");
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

  it("paints nothing for the plain ground and an empty Theme", () => {
    const effective = resolvePhiThemeEffectiveRoot(null, groundOf("plain"));
    expect(effective.background?.light).toBeNull();
    expect(effective.chrome?.dark).toBeNull();
    expect(effective.chrome?.shadow).toBeUndefined();
  });
});
