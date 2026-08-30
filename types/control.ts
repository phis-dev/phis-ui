export const PHI_CONTROL_SIZES = ["small", "medium", "large"] as const;
export const PHI_CONTROL_VARIANTS = ["outlined", "filled", "borderless", "underlined"] as const;

export const PHI_FEEDBACK_LEVELS = [
  "success",
  "info",
  "warning",
  "error",
] as const;

export type PhiFeedbackLevel = (typeof PHI_FEEDBACK_LEVELS)[number];

export type PhiControlSize = (typeof PHI_CONTROL_SIZES)[number];
export type PhiControlVariant = (typeof PHI_CONTROL_VARIANTS)[number];

export type PhiControlPresentationConfig<
  TSize extends PhiControlSize = PhiControlSize,
> = {
  controlSize?: TSize;
};

export function readPhiControlSize(value: unknown): PhiControlSize | undefined {
  return value === "small" || value === "medium" || value === "large"
    ? value
    : undefined;
}
