/*
 * Formatted in the locale the caller names, never `undefined`: that is the browser's locale in the
 * browser and the server's in the server render, and neither is the page's.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function readFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  let formatter = cache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    cache.set(locale, formatter);
  }
  return formatter;
}

function readPhiDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

export function formatPhiDate(value: string | null | undefined, locale: string) {
  const date = readPhiDate(value);
  return date ? readFormatter(dateFormatters, locale, { dateStyle: "medium" }).format(date) : value || "—";
}

export function formatPhiDateTime(value: string | null | undefined, locale: string) {
  const date = readPhiDate(value);
  return date
    ? readFormatter(dateTimeFormatters, locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : value || "—";
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * How long ago or how far ahead, in the locale the caller names: "3 days ago", "in 2 hours". The
 * largest unit the distance fills, so a moment reads in the words a person would use for it.
 */
export function formatPhiRelativeTime(value: string | null | undefined, locale: string, now = Date.now()) {
  const date = readPhiDate(value);
  if (!date) {
    return value || "—";
  }
  let formatter = relativeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relativeFormatters.set(locale, formatter);
  }
  const distance = date.getTime() - now;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(distance) >= size) {
      return formatter.format(Math.round(distance / size), unit);
    }
  }
  return formatter.format(0, "minute");
}
