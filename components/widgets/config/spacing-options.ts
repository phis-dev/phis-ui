import { PHI_MARGIN as PHI_MARGIN_TOKEN, PHI_PADDING } from "../../../theme/phi-tokens";
import { PHI_MARGIN, PHI_SPACE } from "../../../theme/antd-css-var-contract";

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
export type PhiSpacingScaleFamily = "padding" | "margin";

export const PHI_SPACING_SCALE_KEY_OPTIONS: readonly PhiControlOption[] =
  PHI_SPACING_SCALE_KEYS.map((key) => ({ value: key, label: key }));

export function resolvePhiSpacingScaleValue(
  key: PhiSpacingScaleKey,
  family: PhiSpacingScaleFamily,
): number | string {
  if (key === "none") {
    return 0;
  }

  return family === "margin" ? PHI_MARGIN[key] : PHI_SPACE[key];
}

export function resolvePhiSpacingScaleKey(
  value: number | string | null | undefined,
  family: PhiSpacingScaleFamily,
): PhiSpacingScaleKey | null {
  if (value == null) {
    return null;
  }
  if (value === 0 || value === "0" || value === "0px" || value === "0rem") {
    return "none";
  }

  const cssTokens = family === "margin" ? PHI_MARGIN : PHI_SPACE;
  const numericTokens = family === "margin" ? PHI_MARGIN_TOKEN : PHI_PADDING;

  for (const key of PHI_SPACING_TOKEN_KEYS) {
    const numericValue = numericTokens[key];
    if (value === cssTokens[key] || value === numericValue || value === `${numericValue}px`) {
      return key;
    }
  }

  return null;
}

export function buildPhiSpacingScaleOptions(family: PhiSpacingScaleFamily): PhiControlOption[] {
  return PHI_SPACING_SCALE_KEYS.map((key) => ({
    value: String(resolvePhiSpacingScaleValue(key, family)),
    label: key,
  }));
}
