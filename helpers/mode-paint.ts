import type { CSSProperties } from "react";

/**
 * A paint that differs between the page's light and dark mode, as one inline style.
 *
 * A Surface may state a ground per mode (`PhiSurface.backgroundDark`). The server does not know which
 * mode a visitor sees, and the mode switch only turns `data-phi-theme-mode` on the Root Layout without
 * rendering the page again, so the choice has to be made by CSS. Each property that differs is written
 * as two gated values: `styles/root.css` sets one gate empty and the other to the guaranteed-invalid
 * value, so `var(--phi-mode-light-gate, DARK) var(--phi-mode-dark-gate, LIGHT)` reads as `LIGHT` in light
 * mode and `DARK` in dark mode. A fallback may hold commas, so a gradient or a list of layers passes.
 *
 * Where only one mode states a property, the other takes the property's neutral value, so the light
 * picture does not stay behind a dark ground that brings none.
 */
const PHI_MODE_LIGHT_GATE = "--phi-mode-light-gate";
const PHI_MODE_DARK_GATE = "--phi-mode-dark-gate";

const PHI_MODE_PAINT_NEUTRAL: Partial<Record<keyof CSSProperties, string>> = {
  backgroundColor: "transparent",
  backgroundImage: "none",
  backgroundSize: "auto",
  backgroundPosition: "0% 0%",
  backgroundRepeat: "repeat",
  backgroundAttachment: "scroll",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "none",
  filter: "none",
};

/** One value per mode, as one CSS value the page's mode picks from. */
export function resolvePhiModeValue(light: string, dark: string): string {
  return light === dark ? light : `var(${PHI_MODE_LIGHT_GATE}, ${dark}) var(${PHI_MODE_DARK_GATE}, ${light})`;
}

export function composePhiModePaint(light: CSSProperties, dark: CSSProperties): CSSProperties {
  const style: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(light), ...Object.keys(dark)]) as Set<keyof CSSProperties>;
  for (const key of keys) {
    const neutral = PHI_MODE_PAINT_NEUTRAL[key];
    const lightValue = light[key] ?? neutral;
    const darkValue = dark[key] ?? neutral;
    if (lightValue == null || darkValue == null) {
      // A property with no neutral value that only one mode states stays as that mode states it.
      style[key] = lightValue ?? darkValue;
      continue;
    }
    style[key] = resolvePhiModeValue(String(lightValue), String(darkValue));
  }
  return style as CSSProperties;
}
