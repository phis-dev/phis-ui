import { generate } from "@ant-design/colors";

import {
  mergePhiThemePalettes,
  PHI_THEME_CUSTOM_COLOR_KEYS,
  resolvePhiThemePresetPlugin,
  type PhiThemeCustomColorPalette,
  type PhiThemeMode,
  type PhiThemePalette,
  type PhiThemePresetPlugin,
} from "./phi-theme-presets";

type PhiThemeCustomColorSource = {
  preset?: string | null;
  palette?: PhiThemePalette | null;
};

export function buildPhiThemeCustomColorPalette(seedColor: string): PhiThemeCustomColorPalette {
  const generated = generate(seedColor);
  const palette = Object.fromEntries(
    PHI_THEME_CUSTOM_COLOR_KEYS.map((key, index) => [key, generated[index] ?? seedColor]),
  ) as PhiThemeCustomColorPalette;

  return {
    ...palette,
    custom6: seedColor,
  };
}

/**
 * The ten custom colours one palette yields in one mode.
 *
 * A palette may state them outright under `modes[mode].customColors`; whatever it leaves out is
 * generated from its primary colour, the sixth step being the seed itself.
 */
export function resolvePhiThemePaletteCustomColors(
  palette: PhiThemePalette | null | undefined,
  mode: PhiThemeMode,
): PhiThemeCustomColorPalette {
  const modeConfig = palette?.modes?.[mode];
  const seedColor =
    modeConfig?.customColors?.custom6 ??
    modeConfig?.seed?.colorPrimary ??
    palette?.seed?.colorPrimary ??
    "#1677ff";

  return {
    ...buildPhiThemeCustomColorPalette(seedColor),
    ...(modeConfig?.customColors ?? {}),
  };
}

export function resolvePhiThemePresetCustomColors(
  preset: PhiThemePresetPlugin,
  mode: PhiThemeMode,
): PhiThemeCustomColorPalette {
  return resolvePhiThemePaletteCustomColors(preset.palette, mode);
}

/** The custom colours a Site renders: the palette it follows with the Site's own palette on top. */
export function resolvePhiPublishedThemeCustomColors(
  siteTheme: PhiThemeCustomColorSource,
  mode: PhiThemeMode,
  presets: readonly PhiThemePresetPlugin[],
): PhiThemeCustomColorPalette {
  const preset = resolvePhiThemePresetPlugin(presets, siteTheme.preset);
  return resolvePhiThemePaletteCustomColors(mergePhiThemePalettes(preset.palette, siteTheme.palette), mode);
}
