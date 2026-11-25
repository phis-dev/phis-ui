const UNITS = ["B", "KiB", "MiB", "GiB", "TiB"] as const;

/**
 * A size as the CDN page says it: binary units, as the parts and the Media limits are counted, written
 * with the reader's digits. Whole bytes below one KiB, one decimal above.
 */
export function formatPhiCdnBytes(bytes: number, locale: string) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value);
  return `${digits} ${UNITS[unit]}`;
}
