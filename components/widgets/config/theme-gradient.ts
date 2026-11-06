import { PHI_THEME_GRADIENT_KEYS } from "../../../theme/phi-theme-gradients";

/**
 * The Theme's gradient slots as a choice a Widget field offers (theme/phi-theme-gradients.ts).
 *
 * Named by slot and not by look, because the look is the Theme's: "Gradient 1" is burgundy on one Site
 * and teal on the next, and gold in the dark mode of the first. A field that stores the slot keeps
 * following whatever the Theme draws there.
 */
export const PHI_THEME_GRADIENT_FIELD_OPTIONS = PHI_THEME_GRADIENT_KEYS.map((key, index) => ({
  value: key,
  label: `Gradient ${index + 1}`,
}));
