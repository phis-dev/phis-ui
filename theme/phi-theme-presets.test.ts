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
