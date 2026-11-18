import { describe, expect, it } from "vitest";

import {
  isPhiThemePaletteModeSeedKey,
  mergePhiThemePalettes,
  PHI_CORE_THEME_PRESET_PLUGINS,
  resolvePhiThemeColorTokens,
  resolvePhiThemePaletteTokens,
} from "./phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "./phi-theme-palette";

const phis = PHI_CORE_THEME_PRESET_PLUGINS.find((preset) => preset.key === "phis")!;

/**
 * Colour is one shape on both sides of the hand-over: a Module ships a palette, a Site owns one, and an
 * author's change is a palette laid on top. The two base seeds belong to a mode; everything else is
 * shared and derived per mode by Ant Design.
 */
describe("theme palettes", () => {
  it("names the seeds that belong to a mode", () => {
    expect(isPhiThemePaletteModeSeedKey("colorTextBase")).toBe(true);
    expect(isPhiThemePaletteModeSeedKey("colorBgBase")).toBe(true);
    expect(isPhiThemePaletteModeSeedKey("colorPrimary")).toBe(false);
  });

  it("states both modes in every core palette", () => {
    for (const preset of PHI_CORE_THEME_PRESET_PLUGINS) {
      expect(preset.palette.modes?.light?.seed?.colorTextBase).toBeTruthy();
      expect(preset.palette.modes?.dark?.seed?.colorBgBase).toBeTruthy();
    }
  });

  it("resolves shared seeds, mode seeds and mode overrides in that order", () => {
    const tokens = resolvePhiThemePaletteTokens({
      seed: { colorPrimary: "#111111", colorBgLayout: "#eeeeee" },
      modes: { dark: { seed: { colorBgBase: "#000000" }, overrides: { colorBgLayout: "#101010" } } },
    }, "dark");
    expect(tokens).toEqual({ colorPrimary: "#111111", colorBgLayout: "#101010", colorBgBase: "#000000" });
  });

  it("lays the Site's palette over the block it follows, field by field", () => {
    const tokens = resolvePhiThemeColorTokens(phis, {
      seed: { colorPrimary: "#ff0000" },
      modes: { dark: { seed: { colorBgBase: "#050505" } } },
    }, "dark");
    expect(tokens.colorPrimary).toBe("#ff0000");
    expect(tokens.colorBgBase).toBe("#050505");
    // Untouched keys show through from the block, in the mode asked for.
    expect(tokens.colorTextBase).toBe(phis.palette.modes?.dark?.seed?.colorTextBase);
    expect(tokens.colorSuccess).toBe(phis.palette.seed?.colorSuccess);
  });

  it("keeps a mode override of the block from undercutting a shared seed the Site owns", () => {
    const merged = mergePhiThemePalettes(
      { seed: { colorLink: "#000001" }, modes: { light: { overrides: { colorLink: "#000002" } } } },
      { seed: { colorLink: "#ff00ff" } },
    );
    // The merge is per field: the block's light override survives as an override, the Site's seed as a seed.
    expect(merged.seed?.colorLink).toBe("#ff00ff");
    expect(merged.modes?.light?.overrides?.colorLink).toBe("#000002");
  });

  /*
   * The block only proposes: what the Site states wins on every level, and a seed the Site states takes
   * the block's derived colours of that seed with it, so Ant Design derives them from the Site's seed.
   */
  describe("a Site's colours over a block that states derived colours", () => {
    const block = {
      ...phis,
      palette: {
        seed: { colorPrimary: "#78171a", colorLink: "#78171a" },
        modes: {
          light: { overrides: { colorPrimaryHover: "#8d1b1f", colorText: "#666475", colorLinkHover: "#4d0f11" } },
          dark: { overrides: { colorPrimary: "#d95861", colorPrimaryHover: "#e57a82", colorBgContainer: "#211b30" } },
        },
      },
    };

    it("lets a Site's shared seed win over a mode value of the block", () => {
      const tokens = resolvePhiThemeColorTokens(block, { seed: { colorPrimary: "#00aa00" } }, "dark");
      expect(tokens.colorPrimary).toBe("#00aa00");
    });

    it("lets a Site state a seed for one mode alone", () => {
      const site = { modes: { dark: { overrides: { colorPrimary: "#00aa00" } } } };
      expect(resolvePhiThemeColorTokens(block, site, "dark").colorPrimary).toBe("#00aa00");
      expect(resolvePhiThemeColorTokens(block, site, "light").colorPrimary).toBe("#78171a");
    });

    it("drops the block's derived colours of a seed the Site states, in that mode", () => {
      const site = { modes: { dark: { overrides: { colorPrimary: "#00aa00" } } } };
      const dark = resolvePhiThemeColorTokens(block, site, "dark");
      expect(dark).not.toHaveProperty("colorPrimaryHover");
      // The block's other colours stay, and the light mode keeps its own hover.
      expect(dark.colorBgContainer).toBe("#211b30");
      expect(resolvePhiThemeColorTokens(block, site, "light").colorPrimaryHover).toBe("#8d1b1f");
    });

    it("drops them for a mode seed too", () => {
      const light = resolvePhiThemeColorTokens(block, { modes: { light: { seed: { colorTextBase: "#101010" } } } }, "light");
      expect(light.colorTextBase).toBe("#101010");
      expect(light).not.toHaveProperty("colorText");
      expect(light.colorLinkHover).toBe("#4d0f11");
    });

    it("keeps a derived colour the Site states itself", () => {
      const site = { seed: { colorPrimary: "#00aa00" }, modes: { light: { overrides: { colorPrimaryHover: "#00cc00" } } } };
      expect(resolvePhiThemeColorTokens(block, site, "light").colorPrimaryHover).toBe("#00cc00");
    });

    it("keeps the block's derived colours while the Site states no seed", () => {
      expect(resolvePhiThemeColorTokens(block, null, "dark").colorPrimaryHover).toBe("#e57a82");
    });
  });

  it("derives custom colours per mode from the merged palette", () => {
    const colors = resolvePhiPublishedThemeCustomColors(
      { preset: "phis", palette: { modes: { dark: { customColors: { custom1: "#123456" } } } } },
      "dark",
      PHI_CORE_THEME_PRESET_PLUGINS,
    );
    expect(colors.custom1).toBe("#123456");
    expect(colors.custom6).toBe(phis.palette.seed?.colorPrimary);
  });
});
