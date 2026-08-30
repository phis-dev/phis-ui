export const PHI_RATE_DEFAULT_COUNT = 5;

export function normalizePhiRateCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.trunc(value)
    : PHI_RATE_DEFAULT_COUNT;
}

export function normalizePhiRateValue(
  value: number | null | undefined,
  count: number,
  allowHalf: boolean,
) {
  const normalizedCount = normalizePhiRateCount(count);
  const finiteValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(normalizedCount, Math.max(0, finiteValue));
  const step = allowHalf ? 0.5 : 1;
  return Math.min(normalizedCount, Math.round(clampedValue / step) * step);
}
