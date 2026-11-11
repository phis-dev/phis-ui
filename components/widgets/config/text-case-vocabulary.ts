/**
 * Capitals and letter spacing for a short text, as config: so a preset or an agent sets a label the way a
 * Card's eyebrow is set (`components/widgets/shared/eyebrow-style.ts`) without a style of its own.
 *
 * Steps, not lengths: `wide` is the eyebrow's spacing, `wider` the step above it for a label in larger type.
 */
export const PHI_TEXT_TRANSFORMS = ["none", "uppercase"] as const;
export type PhiTextTransform = (typeof PHI_TEXT_TRANSFORMS)[number];

export const PHI_LETTER_SPACING_STEPS = {
  normal: "normal",
  wide: "0.04em",
  wider: "0.08em",
} as const;
export type PhiLetterSpacingStep = keyof typeof PHI_LETTER_SPACING_STEPS;

export function readPhiTextTransform(value: unknown): PhiTextTransform | undefined {
  return (PHI_TEXT_TRANSFORMS as readonly unknown[]).includes(value) ? (value as PhiTextTransform) : undefined;
}

export function readPhiLetterSpacingStep(value: unknown): PhiLetterSpacingStep | undefined {
  return typeof value === "string" && Object.hasOwn(PHI_LETTER_SPACING_STEPS, value)
    ? (value as PhiLetterSpacingStep)
    : undefined;
}

export const PHI_TEXT_TRANSFORM_FIELD_OPTIONS = [
  { value: "none", label: "As written" },
  { value: "uppercase", label: "Capitals" },
] as const;

export const PHI_LETTER_SPACING_FIELD_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
  { value: "wider", label: "Wider" },
] as const;
