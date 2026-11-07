export {
  isPhiThemePaletteModeSeedKey,
  mergePhiThemePalettes,
  PHI_THEME_CUSTOM_COLOR_KEYS,
  PHI_THEME_PALETTE_MODE_SEED_KEYS,
  type PhiThemeCustomColorKey,
  type PhiThemeCustomColorPalette,
  type PhiThemeMode,
  type PhiThemePalette,
  type PhiThemePaletteMode,
  type PhiThemePresetPlugin,
} from "./theme/phi-theme-presets";
export * from "./theme/phi-tokens";
/*
 * The Theme's values as a preset writes them: a step of the spacing scale, a colour role, a corner.
 * Each is a reference the Theme resolves per Site and per mode, never a value of its own, so a preset
 * that names one follows whatever Theme it lands in (THEME.md, "Phi scale").
 */
export { PHI_COLOR, PHI_RADIUS, PHI_SPACE } from "./theme/antd-css-var-contract";
export {
  type PhiThemeBlockIdentity,
  type PhiThemeFontsBlock,
  type PhiThemeGroundBlock,
  type PhiThemePaletteBlock,
  type PhiThemeSetBlock,
  type PhiThemeStyleBlock,
} from "./theme/phi-theme-blocks";
