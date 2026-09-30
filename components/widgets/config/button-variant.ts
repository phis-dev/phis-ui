import type { PhiButtonType } from "../../controls/phi-button-types";
import { readString } from "./parser-primitives";

/**
 * How a button in a Widget's config stands out, in words that belong to this package.
 *
 * `normal` is the plain button, `primary` the one a surface leads with, `dashed` an outlined one for an
 * optional step, `subtle` a button without a frame, `link` one that reads as a link. The Button Control
 * maps them onto its primitive; a config never names the primitive's own vocabulary.
 */
export const PHI_BUTTON_VARIANTS = ["normal", "primary", "dashed", "subtle", "link"] as const;

export type PhiButtonVariant = (typeof PHI_BUTTON_VARIANTS)[number];

export function readPhiButtonVariant(value: unknown): PhiButtonVariant | undefined {
  const variant = readString(value);
  return (PHI_BUTTON_VARIANTS as readonly string[]).includes(variant ?? "")
    ? variant as PhiButtonVariant
    : undefined;
}

const PHI_BUTTON_TYPE_BY_VARIANT: Record<PhiButtonVariant, PhiButtonType> = {
  normal: "default",
  primary: "primary",
  dashed: "dashed",
  subtle: "text",
  link: "link",
};

export function resolvePhiButtonVariantType(variant: PhiButtonVariant | undefined): PhiButtonType | undefined {
  return variant ? PHI_BUTTON_TYPE_BY_VARIANT[variant] : undefined;
}

export const PHI_BUTTON_VARIANT_FIELD_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "primary", label: "Primary" },
  { value: "dashed", label: "Dashed" },
  { value: "subtle", label: "Subtle" },
  { value: "link", label: "Link" },
] as const;
