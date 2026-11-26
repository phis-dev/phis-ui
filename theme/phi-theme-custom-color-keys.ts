/*
 * The palette's ten custom colours, by name. A file of their own, because a colour picker offers them
 * as swatches and reads nothing else of a palette: imported from the presets, the colour field of a
 * Form brought the shipped Theme, its token vocabulary and its seed derivations along (+30 KiB).
 */
export type PhiThemeCustomColorKey =
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4"
  | "custom5"
  | "custom6"
  | "custom7"
  | "custom8"
  | "custom9"
  | "custom10";

export const PHI_THEME_CUSTOM_COLOR_KEYS = [
  "custom1",
  "custom2",
  "custom3",
  "custom4",
  "custom5",
  "custom6",
  "custom7",
  "custom8",
  "custom9",
  "custom10",
] as const satisfies readonly PhiThemeCustomColorKey[];
