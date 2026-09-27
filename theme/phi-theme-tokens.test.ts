import { describe, expect, it } from "vitest";

import {
  PHI_CORE_THEME_PRESET_PLUGINS,
  PHI_THEME_PALETTE_MODE_SEED_KEYS,
  resolvePhiThemeColorTokens,
} from "./phi-theme-presets";
import { assertPhiThemeVocabulary } from "./phi-theme-tokens";

/**
 * Reading a stored Theme, strictly.
 *
 * A name this package does not have reached the resolver unremarked until now: Ant Design ignored it,
 * the page came up, and the one thing an author had set was simply not there. Absent is the only thing
 * that is not a mistake -- a palette that states nothing leaves every answer to the block below it.
 */

const modeSeedKeys = PHI_THEME_PALETTE_MODE_SEED_KEYS;

describe("what a stored Theme may say", () => {
  it("takes the palette this package ships", () => {
    for (const preset of PHI_CORE_THEME_PRESET_PLUGINS) {
      expect(() => assertPhiThemeVocabulary({
        palette: preset.palette,
        modeSeedKeys,
        source: "test",
      })).not.toThrow();
    }
  });

  it("takes a Theme that says nothing at all", () => {
    expect(() => assertPhiThemeVocabulary({ modeSeedKeys, source: "test" })).not.toThrow();
    expect(() => assertPhiThemeVocabulary({
      palette: { seed: {}, modes: { light: {} } },
      styleToken: {},
      modeSeedKeys,
      source: "test",
    })).not.toThrow();
  });

  it("takes the seeds a palette is derived from, and refuses anything else as a shared seed", () => {
    expect(() => assertPhiThemeVocabulary({
      palette: { seed: { colorPrimary: "#fff", colorLink: "#fff" } },
      modeSeedKeys,
      source: "test",
    })).not.toThrow();

    expect(() => assertPhiThemeVocabulary({
      palette: { seed: { colorFillQuaternary: "#fff" } },
      modeSeedKeys,
      source: "test",
    })).toThrow(/colorFillQuaternary/u);
  });

  it("keeps the two base seeds to their mode", () => {
    expect(() => assertPhiThemeVocabulary({
      palette: { modes: { dark: { seed: { colorBgBase: "#000" } } } },
      modeSeedKeys,
      source: "test",
    })).not.toThrow();

    expect(() => assertPhiThemeVocabulary({
      palette: { modes: { dark: { seed: { colorPrimary: "#000" } } } },
      modeSeedKeys,
      source: "test",
    })).toThrow(/the dark seed states "colorPrimary"/u);
  });

  it("holds an override to the vocabulary a render reads", () => {
    expect(() => assertPhiThemeVocabulary({
      palette: { modes: { light: { overrides: { colorFillQuaternary: "rgba(0,0,0,0.03)" } } } },
      modeSeedKeys,
      source: "test",
    })).not.toThrow();

    expect(() => assertPhiThemeVocabulary({
      palette: { modes: { light: { overrides: { colorFillQuintary: "rgba(0,0,0,0.03)" } } } },
      modeSeedKeys,
      source: "test",
    })).toThrow(/colorFillQuintary/u);
  });

  it("lets a style token say a token name, a seed flag, or one of this house's own names", () => {
    expect(() => assertPhiThemeVocabulary({
      styleToken: { borderRadiusLG: 34, controlHeight: 44, wireframe: false, paddingXXL: 155 },
      modeSeedKeys,
      source: "test",
    })).not.toThrow();

    expect(() => assertPhiThemeVocabulary({
      styleToken: { borderRadiusHuge: 99 },
      modeSeedKeys,
      source: "test",
    })).toThrow(/borderRadiusHuge/u);
  });

  it("says where the key stood, because a Theme is folded from several places", () => {
    expect(() => assertPhiThemeVocabulary({
      styleToken: { nonsense: 1 },
      modeSeedKeys,
      source: "The Site's own Theme",
    })).toThrow(/The Site's own Theme: the style token states "nonsense"/u);
  });

  it("names every offending key at once rather than the first", () => {
    expect(() => assertPhiThemeVocabulary({
      palette: { seed: { nonsenseOne: "#fff" } },
      styleToken: { nonsenseTwo: 1 },
      modeSeedKeys,
      source: "test",
    })).toThrow(/nonsenseOne[\s\S]*nonsenseTwo/u);
  });
});

describe("where the colours are resolved", () => {
  it("refuses a Site palette that names something this package does not have", () => {
    expect(() => resolvePhiThemeColorTokens(
      PHI_CORE_THEME_PRESET_PLUGINS[0]!,
      { seed: { colorPrimry: "#E05A2A" } },
      "light",
    )).toThrow(/The Site's own Theme: the palette seed states "colorPrimry"/u);
  });

  it("resolves a Site palette that keeps to it", () => {
    const tokens = resolvePhiThemeColorTokens(
      PHI_CORE_THEME_PRESET_PLUGINS[0]!,
      { seed: { colorPrimary: "#123456" } },
      "light",
    );

    expect(tokens.colorPrimary).toBe("#123456");
  });
});
