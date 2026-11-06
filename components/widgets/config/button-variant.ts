import type { PhiButtonType } from "../../controls/phi-button-types";
import type { PhiThemeGradientKey } from "../../../theme/phi-theme-gradients";
import { readString } from "./parser-primitives";

/**
 * How a button in a Widget's config stands out, in words that belong to this package.
 *
 * `normal` is the plain button, `primary` the one a surface leads with, `dashed` an outlined one for an
 * optional step, `subtle` a button without a frame, `link` one that reads as a link. `gradient` is filled
 * with one of the Theme's gradient slots, `glass` a frosted pane for a button over a picture or a run.
 * The Button Control maps them onto its primitive; a config never names the primitive's own vocabulary.
 */
export const PHI_BUTTON_VARIANTS = ["normal", "primary", "dashed", "subtle", "link", "gradient", "glass"] as const;

export type PhiButtonVariant = (typeof PHI_BUTTON_VARIANTS)[number];

export function readPhiButtonVariant(value: unknown): PhiButtonVariant | undefined {
  const variant = readString(value);
  return (PHI_BUTTON_VARIANTS as readonly string[]).includes(variant ?? "")
    ? variant as PhiButtonVariant
    : undefined;
}

/*
 * A gradient Button is a primary one underneath -- its colour is the edge and the fallback where the
 * run is not drawn -- and a glass one is the plain one with a pane over it.
 */
const PHI_BUTTON_TYPE_BY_VARIANT: Record<PhiButtonVariant, PhiButtonType> = {
  normal: "default",
  primary: "primary",
  dashed: "dashed",
  subtle: "text",
  link: "link",
  gradient: "primary",
  glass: "default",
};

/** What the Button Control is handed for a variant: its primitive type, and the run or the pane. */
export type PhiButtonVariantPresentation = {
  type?: PhiButtonType;
  gradient?: PhiThemeGradientKey;
  glass?: boolean;
};

/**
 * A variant as the Button Control's props. The `gradient` variant takes the slot it names, the Theme's
 * first where it names none, so choosing the variant alone already draws a run.
 */
export function resolvePhiButtonVariantPresentation(
  variant: PhiButtonVariant | undefined,
  gradient?: PhiThemeGradientKey,
): PhiButtonVariantPresentation {
  if (!variant) return {};
  return {
    type: PHI_BUTTON_TYPE_BY_VARIANT[variant],
    ...(variant === "gradient" ? { gradient: gradient ?? "gradient1" } : {}),
    ...(variant === "glass" ? { glass: true } : {}),
  };
}

export const PHI_BUTTON_VARIANT_FIELD_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "primary", label: "Primary" },
  { value: "dashed", label: "Dashed" },
  { value: "subtle", label: "Subtle" },
  { value: "link", label: "Link" },
  { value: "gradient", label: "Gradient" },
  { value: "glass", label: "Glass" },
] as const;
