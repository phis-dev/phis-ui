import { PHI_PADDING } from "../../../theme/phi-tokens";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";

import type { PhiControlOption } from "../../controls/phi-control-options";

export const PHI_SPACING_SCALE_KEYS = [
  "none",
  "xxs",
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
  "xxl",
] as const;

export const PHI_SPACING_TOKEN_KEYS = [
  "xxs",
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
  "xxl",
] as const;

export type PhiSpacingScaleKey = (typeof PHI_SPACING_SCALE_KEYS)[number];

/** A step of the one spacing scale, for a padding and a gap alike (`theme/phi-tokens.ts`). */
export function resolvePhiSpacingScaleValue(key: PhiSpacingScaleKey): number | string {
  if (key === "none") {
    return 0;
  }

  return PHI_SPACE[key];
}

export function resolvePhiSpacingScaleKey(
  value: number | string | null | undefined,
): PhiSpacingScaleKey | null {
  if (value == null) {
    return null;
  }
  if (value === 0 || value === "0" || value === "0px" || value === "0rem") {
    return "none";
  }

  for (const key of PHI_SPACING_TOKEN_KEYS) {
    const numericValue = PHI_PADDING[key];
    if (value === PHI_SPACE[key] || value === numericValue || value === `${numericValue}px`) {
      return key;
    }
  }

  return null;
}

export function buildPhiSpacingScaleOptions(): PhiControlOption[] {
  return PHI_SPACING_SCALE_KEYS.map((key) => ({
    value: String(resolvePhiSpacingScaleValue(key)),
    label: key,
  }));
}
