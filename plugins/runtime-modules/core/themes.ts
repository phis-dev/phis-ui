import type { PhiCmsThemePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../../theme/phi-theme-presets";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";

/* The Theme presets Core ships, one descriptor each. */
export const PHI_CORE_RUNTIME_MODULE_THEMES = PHI_CORE_THEME_PRESET_PLUGINS.map((preset) => ({
  ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  presetKey: `${preset.key}-theme-preset`,
  presetVersion: 1,
  themeKey: preset.key,
  title: preset.title,
  ...(preset.description ? { description: preset.description } : {}),
  loadPreset: () => preset,
})) satisfies readonly PhiCmsThemePresetDescriptor[];
