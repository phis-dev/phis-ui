export function resolvePhiMotionDurationMs(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  const duration = Number.parseFloat(value);
  if (!Number.isFinite(duration)) return 0;
  return value.trim().endsWith("ms") ? duration : duration * 1000;
}
