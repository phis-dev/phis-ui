import type { PhiThemeMode } from "./phi-theme-presets";

/**
 * The depth behind a Surface's shadow steps.
 *
 * A Surface states its shadow as a step -- `soft` or `strong` (`types/layout-style.ts`) -- and the step is
 * this package's own, not Ant Design's: it used to be `boxShadowTertiary` and `boxShadow`, the tokens
 * Ant Design's dropdowns, popovers and cards draw with, so a deeper card would have deepened every menu
 * with it, and the house's cards stood barely lifted off a light page. Each step is a token of its own
 * (`surfaceShadowSoft`, `surfaceShadowStrong`), written as `--phi-surface-shadow-soft` and
 * `--phi-surface-shadow-strong` per mode and per Surface tone like every other token.
 *
 * A shadow does not read the same in both modes: the dark that lifts a card off a light ground
 * disappears into a dark one. So a Theme does not store CSS but a depth per step -- `flat`, `normal`,
 * `pronounced` -- and the depth becomes the mode's CSS here. `normal` is what a Theme that says nothing
 * gets.
 */

export const PHI_SURFACE_SHADOW_STEPS = ["soft", "strong"] as const;
export type PhiSurfaceShadowStep = (typeof PHI_SURFACE_SHADOW_STEPS)[number];

export const PHI_SURFACE_SHADOW_DEPTHS = ["flat", "normal", "pronounced"] as const;
export type PhiSurfaceShadowDepth = (typeof PHI_SURFACE_SHADOW_DEPTHS)[number];

export type PhiThemeShadows = Partial<Record<PhiSurfaceShadowStep, PhiSurfaceShadowDepth | null>>;

/** What a Surface's step draws, as the variable the stylesheet and every resolver read. */
export const PHI_SURFACE_SHADOW_VARIABLES: Record<PhiSurfaceShadowStep, string> = {
  soft: "var(--phi-surface-shadow-soft)",
  strong: "var(--phi-surface-shadow-strong)",
};

const PHI_SURFACE_SHADOW_CSS: Record<PhiThemeMode, Record<PhiSurfaceShadowStep, Record<PhiSurfaceShadowDepth, string>>> = {
  light: {
    soft: {
      flat: "0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 6px -1px rgba(0, 0, 0, 0.03)",
      normal: "0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.08)",
      pronounced: "0 2px 4px rgba(0, 0, 0, 0.08), 0 6px 18px rgba(0, 0, 0, 0.12)",
    },
    strong: {
      flat: "0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 20px rgba(0, 0, 0, 0.10)",
      normal: "0 2px 4px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.16)",
      pronounced: "0 4px 8px rgba(0, 0, 0, 0.10), 0 18px 44px rgba(0, 0, 0, 0.22)",
    },
  },
  dark: {
    soft: {
      flat: "0 1px 2px rgba(0, 0, 0, 0.30), 0 2px 8px rgba(0, 0, 0, 0.25)",
      normal: "0 1px 2px rgba(0, 0, 0, 0.40), 0 4px 12px rgba(0, 0, 0, 0.35)",
      pronounced: "0 2px 4px rgba(0, 0, 0, 0.50), 0 6px 18px rgba(0, 0, 0, 0.45)",
    },
    strong: {
      flat: "0 2px 4px rgba(0, 0, 0, 0.40), 0 8px 20px rgba(0, 0, 0, 0.40)",
      normal: "0 2px 4px rgba(0, 0, 0, 0.50), 0 12px 32px rgba(0, 0, 0, 0.55)",
      pronounced: "0 4px 8px rgba(0, 0, 0, 0.60), 0 18px 44px rgba(0, 0, 0, 0.65)",
    },
  },
};

function isPhiSurfaceShadowDepth(value: unknown): value is PhiSurfaceShadowDepth {
  return typeof value === "string" && (PHI_SURFACE_SHADOW_DEPTHS as readonly string[]).includes(value);
}

/** The depth a Theme gives a step: its stated one, else `normal`. */
export function readPhiSurfaceShadowDepth(
  shadows: PhiThemeShadows | null | undefined,
  step: PhiSurfaceShadowStep,
): PhiSurfaceShadowDepth {
  const depth = shadows?.[step];
  return isPhiSurfaceShadowDepth(depth) ? depth : "normal";
}

/** The two tokens one mode writes, from the Theme's depths. */
export function buildPhiSurfaceShadowTokens(shadows: PhiThemeShadows | null | undefined, mode: PhiThemeMode) {
  return {
    surfaceShadowSoft: PHI_SURFACE_SHADOW_CSS[mode].soft[readPhiSurfaceShadowDepth(shadows, "soft")],
    surfaceShadowStrong: PHI_SURFACE_SHADOW_CSS[mode].strong[readPhiSurfaceShadowDepth(shadows, "strong")],
  };
}
