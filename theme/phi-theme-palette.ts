import { generate } from "@ant-design/colors";

import {
  PHI_THEME_CUSTOM_COLOR_KEYS,
  resolvePhiThemePresetPlugin,
  type PhiThemeCustomColorPalette,
  type PhiThemeMode,
  type PhiThemePresetPlugin,
} from "./phi-theme-presets";

type PhiThemeCustomColorSource = {
  preset?: string | null;
  phi?: {
    customColors?: Partial<Record<PhiThemeMode, Partial<PhiThemeCustomColorPalette>>>;
  };
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

export function resolvePhiThemePresetCustomColors(
  preset: PhiThemePresetPlugin,
  mode: PhiThemeMode,
): PhiThemeCustomColorPalette {
  const modeConfig = preset.antd.modes?.[mode];
  const seedColor =
    modeConfig?.customColors?.custom6 ??
    preset.phi?.customColors?.[mode]?.custom6 ??
    modeConfig?.seed?.colorPrimary ??
    preset.antd.seed.colorPrimary ??
    "#1677ff";

  return {
    ...buildPhiThemeCustomColorPalette(seedColor),
    ...(preset.phi?.customColors?.[mode] ?? {}),
    ...(modeConfig?.customColors ?? {}),
  };
}

export function resolvePhiPublishedThemeCustomColors(
  siteTheme: PhiThemeCustomColorSource,
  mode: PhiThemeMode,
  presets: readonly PhiThemePresetPlugin[],
): PhiThemeCustomColorPalette {
  const preset = resolvePhiThemePresetPlugin(presets, siteTheme.preset);
  return {
    ...resolvePhiThemePresetCustomColors(preset, mode),
    ...(siteTheme.phi?.customColors?.[mode] ?? {}),
  };
}
