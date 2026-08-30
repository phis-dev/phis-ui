export type PhiButtonType = "default" | "primary" | "dashed" | "text" | "link";

export function readPhiButtonType(value: unknown): PhiButtonType {
  const buttonType = typeof value === "string" ? value.trim() : undefined;
  return buttonType === "primary" ||
    buttonType === "dashed" ||
    buttonType === "text" ||
    buttonType === "link"
    ? buttonType
    : "default";
}
