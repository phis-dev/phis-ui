import type { CSSProperties } from "react";

import { PHI_COLOR, PHI_SHADOW } from "../theme/antd-css-var-contract";
import {
  type PhiGlassLayoutEffectId,
  type PhiShadow,
} from "../types/layout-style";

/**
 * What each glass strength is made of.
 *
 * The two numbers move together. The radius alone decides how much of the ground survives as shape,
 * the share decides how much of it survives as light, and changing one without the other gives a
 * window that is dirty rather than glass that is lighter.
 */
export const PHI_GLASS_LAYOUT_EFFECT_DEFINITIONS = {
  glass: { filter: "blur(24px) saturate(1.2)", strengthPercent: 36 },
  haze: { filter: "blur(10px) saturate(1.1)", strengthPercent: 60 },
} as const satisfies Record<PhiGlassLayoutEffectId, { filter: string; strengthPercent: number }>;

function resolvePhiGlassBackground(
  background: CSSProperties["background"] | null | undefined,
  strengthPercent: number,
) {
  const base = typeof background === "string" && background.trim()
    ? background
    : PHI_COLOR.bgElevated;
  return `color-mix(in srgb, ${base} ${strengthPercent}%, transparent)`;
}

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
  effect?: PhiGlassLayoutEffectId | null;
  background?: CSSProperties["background"];
}): CSSProperties | undefined {
  if (effect == null) {
    return undefined;
  }

  const glass = PHI_GLASS_LAYOUT_EFFECT_DEFINITIONS[effect];
  /*
   * The ground as `backgroundColor`, never as the `background` shorthand.
   *
   * Callers spread this into an inline style that also carries longhands, from an authored Background
   * config or from the Shell Chrome Overlay, and React warns when a rerender has to drop a longhand
   * from an element whose shorthand is still set. The value is always a colour, so the longhand says
   * the same thing without the shorthand's silent resets.
   */
  return {
    backgroundColor: resolvePhiGlassBackground(background, glass.strengthPercent),
    backdropFilter: glass.filter,
    WebkitBackdropFilter: glass.filter,
  };
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
