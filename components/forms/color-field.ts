import { parsePhiThemeColor } from "../../theme/phi-theme-color";

/* A Theme role as a swatch stores it: the custom property the Theme writes, `var(--phi-color-primary)`. */
const PHI_COLOR_FIELD_ROLE = /^var\(--phi-[a-z0-9-]+\)$/u;

/**
 * The value of a `color` field (FORMS.md): what the Inspector's colour field holds. A CSS colour as the
 * picker writes it -- `#rrggbb`, `#rrggbbaa`, `rgb(...)`/`rgba(...)` -- or, where a Theme swatch was
 * picked, the Theme role it shows (`var(--phi-color-primary)`, `var(--phi-custom-3)`), which follows the
 * Theme and the mode. `null` for no colour: nothing held, or an empty string.
 *
 * Read strictly: anything else -- a number, a record, a colour name, a gradient -- is no value this field
 * writes, and it throws rather than showing a colour nobody stored.
 */
export function readPhiColorFieldValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (text === "") return null;
    if (parsePhiThemeColor(text) || PHI_COLOR_FIELD_ROLE.test(text)) return text;
  }
  throw new Error(
    `A color field holds a CSS colour (#rrggbb, rgb(...)) or a Theme role (var(--phi-...)), not ${JSON.stringify(value)}.`,
  );
}
