import { describe, expect, it } from "vitest";

import { resolvePhiAntdAliasTokens } from "./phi-antd-token-resolver";
import { isSamePhiThemeColor } from "./phi-theme-color";
import { omitPhiThemePaletteDefaults } from "./phi-theme-palette-defaults";
import { mergePhiThemePalettes, type PhiThemePalette, type PhiThemePresetPlugin } from "./phi-theme-presets";

const block = (palette: PhiThemePalette): PhiThemePresetPlugin => ({ key: "block", version: 1, title: "Block", palette });

const MODULE_PALETTE: PhiThemePalette = {
  seed: { colorPrimary: "#C35800", colorInfo: "#3E76D1", colorLink: "#3E76D1" },
  modes: {
    light: { seed: { colorTextBase: "#223A61", colorBgBase: "#ffffff" } },
    dark: { seed: { colorTextBase: "#DCE7F8", colorBgBase: "#050914" } },
  },
};

describe("isSamePhiThemeColor", () => {
  it("reads one colour in its spellings as one", () => {
    expect(isSamePhiThemeColor("#1677FF", "#1677ff")).toBe(true);
    expect(isSamePhiThemeColor("#fff", "#FFFFFF")).toBe(true);
    expect(isSamePhiThemeColor("rgb(22, 119, 255)", "#1677ff")).toBe(true);
    expect(isSamePhiThemeColor("#1677ffff", "#1677ff")).toBe(true);
  });

  it("tells colours and alphas apart, and compares what is no colour as text", () => {
    expect(isSamePhiThemeColor("#1677ff", "#1677fe")).toBe(false);
    expect(isSamePhiThemeColor("rgba(22, 119, 255, 0.5)", "#1677ff")).toBe(false);
    expect(isSamePhiThemeColor("var(--x)", "var(--x)")).toBe(true);
    expect(isSamePhiThemeColor("var(--x)", "#1677ff")).toBe(false);
    expect(isSamePhiThemeColor(undefined, "#1677ff")).toBe(false);
  });
});

/**
 * A Site's palette entry is a decision only where it changes the render: the Theme workspace offers a
 * reset for it, and the save stores it. One that repeats the Theme is neither.
 */
describe("omitPhiThemePaletteDefaults", () => {
  it("drops a Module palette taken over on save, entry for entry", () => {
    expect(omitPhiThemePaletteDefaults(block(MODULE_PALETTE), mergePhiThemePalettes(MODULE_PALETTE, null))).toEqual({});
  });

  it("drops a colour spelt differently from the block's, and keeps one that differs", () => {
    const own: PhiThemePalette = {
      seed: { colorPrimary: "#c35800", colorInfo: "rgb(62, 118, 209)", colorLink: "#123456" },
      modes: { light: { seed: { colorTextBase: "#223a61" } } },
    };
    expect(omitPhiThemePaletteDefaults(block(MODULE_PALETTE), own)).toEqual({ seed: { colorLink: "#123456" } });
  });

  it("keeps the parts of a mode it does not judge", () => {
    const own: PhiThemePalette = {
      seed: { colorPrimary: "#C35800" },
      modes: { dark: { customColors: { custom1: "#C35800" }, gradients: {} } },
    };
    expect(omitPhiThemePaletteDefaults(block(MODULE_PALETTE), own)).toEqual({
      modes: { dark: { customColors: { custom1: "#C35800" }, gradients: {} } },
    });
  });

  it("drops a seed the block leaves to Ant Design where it is Ant Design's own", () => {
    const preset = block({ seed: { colorPrimary: "#C35800" } });
    const antdSuccess = String(resolvePhiAntdAliasTokens("light", {}).colorSuccess);
    expect(omitPhiThemePaletteDefaults(preset, { seed: { colorSuccess: antdSuccess.toUpperCase() } })).toEqual({});
    expect(omitPhiThemePaletteDefaults(preset, { seed: { colorSuccess: "#20866C" } })).toEqual({
      seed: { colorSuccess: "#20866C" },
    });
  });

  it("keeps a seed equal to the block's that releases a derived colour the block states", () => {
    const preset = block({
      seed: { colorPrimary: "#C35800" },
      modes: { light: { overrides: { colorPrimaryHover: "#000000" } }, dark: { overrides: { colorPrimaryHover: "#000000" } } },
    });
    expect(omitPhiThemePaletteDefaults(preset, { seed: { colorPrimary: "#C35800" } })).toEqual({
      seed: { colorPrimary: "#C35800" },
    });
    // Stated together with the block's derived colour, it changes nothing again.
    expect(omitPhiThemePaletteDefaults(preset, mergePhiThemePalettes(preset.palette, null))).toEqual({});
  });

  it("drops a derived override equal to what the seed yields, and keeps one that is not", () => {
    const preset = block(MODULE_PALETTE);
    const hover = String(resolvePhiAntdAliasTokens("light", { colorPrimary: "#2F6B3A" }).colorPrimaryHover);
    expect(omitPhiThemePaletteDefaults(preset, {
      seed: { colorPrimary: "#2F6B3A" },
      modes: { light: { overrides: { colorPrimaryHover: hover } } },
    })).toEqual({ seed: { colorPrimary: "#2F6B3A" } });
    expect(omitPhiThemePaletteDefaults(preset, {
      modes: { light: { overrides: { colorPrimaryHover: "#000000" } } },
    })).toEqual({ modes: { light: { overrides: { colorPrimaryHover: "#000000" } } } });
  });

  it("keeps a shared seed that one mode of the block states otherwise", () => {
    const preset = block({ seed: { colorPrimary: "#C35800" }, modes: { dark: { overrides: { colorPrimary: "#FFAA00" } } } });
    expect(omitPhiThemePaletteDefaults(preset, { seed: { colorPrimary: "#C35800" } })).toEqual({
      seed: { colorPrimary: "#C35800" },
    });
  });
});
