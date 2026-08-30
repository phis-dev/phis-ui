import type { PhiRenderableBlockSize } from "./renderable-block";
import { readPhiCssLengthPart, serializePhiCssLength } from "./length";

export function readPhiDimensionValue(value: unknown): PhiRenderableBlockSize | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const width = readPhiCssLengthPart(record.width);
  const height = readPhiCssLengthPart(record.height);

  if ((!width || width.value < 0) && (!height || height.value < 0)) {
    return null;
  }

  return {
    ...(width && width.value >= 0 ? { width: serializePhiCssLength(width.value, width.unit) } : {}),
    ...(height && height.value >= 0 ? { height: serializePhiCssLength(height.value, height.unit) } : {}),
  };
}
