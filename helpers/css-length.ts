export function resolvePhiCssLength(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  return undefined;
}
