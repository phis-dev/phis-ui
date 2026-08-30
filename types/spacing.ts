export const PHI_SPACING_TOKENS = [
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

export type PhiSpacingToken = (typeof PHI_SPACING_TOKENS)[number];

export function isPhiSpacingToken(value: unknown): value is PhiSpacingToken {
  return typeof value === "string" && (PHI_SPACING_TOKENS as readonly string[]).includes(value);
}
