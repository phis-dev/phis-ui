import type { PhiThemeMode } from "./phi-theme-presets";

/**
 * The shadow under each kind of Button, as a step rather than as CSS.
 *
 * Ant Design draws it with a component token per kind -- `defaultShadow`, `primaryShadow`,
 * `dangerShadow` -- tinted from three different places: a fill, the primary outline, a fade of the error
 * background that is also the ground of every error Alert and Tag. None of them is only the shadow, so a
 * Theme that wants another one sets the component token.
 *
 * A component token has one value for both modes, and a shadow does not: the dark that reads as an edge
 * on a light ground disappears into a dark one. So a Theme stores the step, and the step becomes CSS
 * where the mode is known -- the root theme and the Theme workspace preview. A kind the Theme leaves
 * unset keeps Ant Design's tinted line.
 *
 * The steps are Button shadows of their own rather than the Shadow presets a Card takes: those spread
 * wide enough to lift a panel, and under something as small as a Button they read as a blur, not an edge.
 */

export const PHI_BUTTON_SHADOW_KINDS = ["default", "primary", "danger"] as const;
export type PhiButtonShadowKind = (typeof PHI_BUTTON_SHADOW_KINDS)[number];

export const PHI_BUTTON_SHADOW_STEPS = ["none", "soft", "strong"] as const;
export type PhiButtonShadowStep = (typeof PHI_BUTTON_SHADOW_STEPS)[number];

export type PhiThemeButtons = {
  shadow?: Partial<Record<PhiButtonShadowKind, PhiButtonShadowStep>> | null;
};

const PHI_BUTTON_SHADOW_CSS: Record<PhiThemeMode, Record<PhiButtonShadowStep, string>> = {
  light: {
    none: "none",
    soft: "0 1px 2px rgba(0, 0, 0, 0.16)",
    strong: "0 2px 3px rgba(0, 0, 0, 0.28)",
  },
  dark: {
    none: "none",
    soft: "0 1px 2px rgba(0, 0, 0, 0.45)",
    strong: "0 2px 3px rgba(0, 0, 0, 0.7)",
  },
};

const PHI_BUTTON_SHADOW_TOKENS: Record<PhiButtonShadowKind, string> = {
  default: "defaultShadow",
  primary: "primaryShadow",
  danger: "dangerShadow",
};

export function isPhiButtonShadowStep(value: unknown): value is PhiButtonShadowStep {
  return typeof value === "string" && (PHI_BUTTON_SHADOW_STEPS as readonly string[]).includes(value);
}

/** The Button component tokens a Theme's shadow steps stand for in one mode; empty when it sets none. */
export function buildPhiButtonShadowComponentTokens(
  buttons: PhiThemeButtons | null | undefined,
  mode: PhiThemeMode,
): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const kind of PHI_BUTTON_SHADOW_KINDS) {
    const step = buttons?.shadow?.[kind];
    if (isPhiButtonShadowStep(step)) {
      tokens[PHI_BUTTON_SHADOW_TOKENS[kind]] = PHI_BUTTON_SHADOW_CSS[mode][step];
    }
  }
  return tokens;
}

/**
 * The Theme's component overrides with its Button shadows laid in for one mode.
 *
 * Under the Site's own `components.Button`, so a token somebody set there by hand still wins.
 */
export function applyPhiButtonShadowComponentTokens(
  components: Record<string, Record<string, unknown>> | null | undefined,
  buttons: PhiThemeButtons | null | undefined,
  mode: PhiThemeMode,
): Record<string, Record<string, unknown>> | undefined {
  const shadowTokens = buildPhiButtonShadowComponentTokens(buttons, mode);
  if (Object.keys(shadowTokens).length === 0) {
    return components ?? undefined;
  }
  return {
    ...(components ?? {}),
    Button: { ...shadowTokens, ...(components?.Button ?? {}) },
  };
}
