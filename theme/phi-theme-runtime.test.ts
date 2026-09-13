import { describe, expect, it } from "vitest";

import { createPhiControlShapeCorners } from "./phi-control-shape";
import { PHI_CORE_THEME_BLOCK_CATALOG } from "./phi-theme-composition";
import { resolvePhiThemeRuntimePayload } from "./phi-theme-runtime";

/**
 * Everything downstream reads an ordinary Theme record. The blocks are folded in once, here, so no
 * consumer has to learn that a Module shipped half of the look.
 */
describe("theme runtime payload", () => {
  it("presents the palette block as the preset every colour consumer resolves", () => {
    const { theme } = resolvePhiThemeRuntimePayload({ blocks: { palette: { key: "forest" } } });
    expect(theme.preset).toBe("forest");
    expect(theme.presetVersion).toBe(1);
  });

  it("leaves a Theme from before the split exactly as it was", () => {
    const { theme } = resolvePhiThemeRuntimePayload({ preset: "sea", presetVersion: 1 });
    expect(theme.preset).toBe("sea");
    expect(theme.style?.token).toEqual({});
    expect(theme.root).toEqual({
      background: { light: null, dark: null },
      chrome: { light: null, dark: null },
    });
  });

  it("puts the style block under the author's tokens", () => {
    const { theme } = resolvePhiThemeRuntimePayload(
      { blocks: { style: { key: "brutal" } }, style: { token: { borderRadius: 20 } } },
      {
        ...PHI_CORE_THEME_BLOCK_CATALOG,
        styles: [
          ...PHI_CORE_THEME_BLOCK_CATALOG.styles,
          {
            key: "brutal",
            version: 1,
            title: "Brutal",
            style: { token: { borderRadius: 0, controlHeight: 28 } },
            shape: { controls: createPhiControlShapeCorners("square") },
          },
        ],
      },
    );
    expect(theme.style?.token).toEqual({ borderRadius: 20, controlHeight: 28 });
  });

  it("states the style block's Control shape wherever the author picked none", () => {
    expect(resolvePhiThemeRuntimePayload({}).theme.shape?.controls)
      .toEqual(createPhiControlShapeCorners("rounded"));
    const pill = createPhiControlShapeCorners("pill");
    expect(resolvePhiThemeRuntimePayload({ shape: { controls: pill } }).theme.shape?.controls).toEqual(pill);
  });

  it("refuses a Control shape that is not four named corners", () => {
    expect(() => resolvePhiThemeRuntimePayload({ shape: { controls: "rounded" as never } })).toThrow();
  });

  it("merges the ground and keeps the author's mode on top", () => {
    const { theme } = resolvePhiThemeRuntimePayload({
      blocks: { set: { key: "forest" } },
      root: { background: { light: { base: { kind: "color", color: "#101010" } } } },
    });
    expect(theme.root?.background?.light?.base).toEqual({ kind: "color", color: "#101010" });
    expect(theme.root?.background?.dark?.base?.kind).toBe("gradient");
    expect(theme.root?.chrome?.light?.effect).toBe("glass");
  });

  it("reports the parts that fell back to a core block", () => {
    const { composition } = resolvePhiThemeRuntimePayload({
      blocks: { ground: { key: "@acme/ui/grounds/dunes" } },
    });
    expect(composition.unavailable.ground).toBe("@acme/ui/grounds/dunes");
    expect(composition.ground.key).toBe("plain");
  });

  it("keeps every other field of the record untouched", () => {
    const { theme } = resolvePhiThemeRuntimePayload({
      mode: "dark",
      fonts: { body: "Inter" },
      brand: { logoAssetId: 7 },
    } as Record<string, unknown>);
    expect(theme.mode).toBe("dark");
    expect(theme.fonts).toEqual({ body: "Inter" });
    expect(theme.brand).toEqual({ logoAssetId: 7 });
  });
});
