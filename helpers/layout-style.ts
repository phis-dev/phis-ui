import type { CSSProperties } from "react";

import { PHI_COLOR, PHI_SHADOW } from "../theme/antd-css-var-contract";
import type { PhiShadow, PhiLayoutEffectId } from "../types/layout-style";

export const PHI_GLASS_BACKGROUND_STRENGTH_PERCENT = 36;
export const PHI_GLASS_BACKDROP_FILTER = "blur(24px) saturate(1.2)";

function resolvePhiGlassBackground(
  background: CSSProperties["background"] | null | undefined,
) {
  const base = typeof background === "string" && background.trim()
    ? background
    : PHI_COLOR.bgElevated;
  return `color-mix(in srgb, ${base} ${PHI_GLASS_BACKGROUND_STRENGTH_PERCENT}%, transparent)`;
}

export const PHI_LAYOUT_EFFECT_DEFINITIONS = {
  glass: {
    backdropFilter: PHI_GLASS_BACKDROP_FILTER,
  },
  blur: {
    filter: "blur(6px)",
  },
  dim: {
    filter: "brightness(0.85)",
  },
  tint: {
    boxShadow: `inset 0 0 0 9999px color-mix(in srgb, ${PHI_COLOR.bgElevated} 16%, transparent)`,
  },
} as const satisfies Record<PhiLayoutEffectId, Readonly<CSSProperties>>;

export const PHI_SHADOW_DEFINITIONS = {
  none: "none",
  soft: PHI_SHADOW.tertiary,
  strong: PHI_SHADOW.primary,
} as const;

export function resolvePhiShadow(value: PhiShadow | null | undefined): CSSProperties["boxShadow"] | undefined {
  if (value == null) {
    return undefined;
  }

  return typeof value === "string"
    ? PHI_SHADOW_DEFINITIONS[value]
    : value.value;
}

export function resolvePhiLayoutEffectStyle({
  effect,
  background,
}: {
  effect?: PhiLayoutEffectId | null;
  background?: CSSProperties["background"];
}): CSSProperties | undefined {
  if (effect == null) {
    return undefined;
  }

  const definition = PHI_LAYOUT_EFFECT_DEFINITIONS[effect];
  if (effect === "glass") {
    return {
      background: resolvePhiGlassBackground(background),
      backdropFilter: PHI_GLASS_BACKDROP_FILTER,
      WebkitBackdropFilter: PHI_GLASS_BACKDROP_FILTER,
    };
  }

  return definition;
}

export function composePhiLayoutEffectStyle(
  baseStyle: CSSProperties,
  effectStyle: CSSProperties | null | undefined,
): CSSProperties {
  if (!effectStyle) {
    return baseStyle;
  }

  const effectBackground = effectStyle.background ?? effectStyle.backgroundColor;
  if (effectBackground == null) {
    return { ...baseStyle, ...effectStyle };
  }

  const baseRest = { ...baseStyle };
  delete baseRest.background;
  delete baseRest.backgroundColor;
  const effectRest = { ...effectStyle };
  delete effectRest.background;
  delete effectRest.backgroundColor;

  return {
    ...baseRest,
    ...effectRest,
    backgroundColor: effectBackground as CSSProperties["backgroundColor"],
  };
}

export function combinePhiBoxShadows(
  ...values: Array<CSSProperties["boxShadow"] | null | undefined>
): CSSProperties["boxShadow"] | undefined {
  const shadows = values.filter((value): value is string => typeof value === "string" && value !== "none");
  return shadows.length > 0 ? shadows.join(", ") : values.some((value) => value === "none") ? "none" : undefined;
}
