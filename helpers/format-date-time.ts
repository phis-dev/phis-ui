/*
 * Formatted in the locale and the time zone the caller names, never `undefined`: that is the browser's
 * in the browser and the server's in the server render, and neither is the page's. The zone is the
 * Site's (`runtime.site.timeZone`, or `usePhiIntlTimeZone()` in a Client component), so that the text
 * the server wrote and the text the browser hydrates it with are one.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function readFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  const key = `${locale}\u0000${timeZone}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    cache.set(key, formatter);
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

export function formatPhiDate(value: string | null | undefined, locale: string, timeZone: string) {
  const date = readPhiDate(value);
  return date ? readFormatter(dateFormatters, locale, timeZone, { dateStyle: "medium" }).format(date) : value || "—";
}

export function formatPhiDateTime(value: string | null | undefined, locale: string, timeZone: string) {
  const date = readPhiDate(value);
  return date
    ? readFormatter(dateTimeFormatters, locale, timeZone, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : value || "—";
}

/**
 * The moment a server render happens, for the Root Layout to hand to `PhiIntlLocaleProvider`.
 *
 * A function and not `Date.now()` in the layout because a render is meant to be pure, and the lint says
 * so; this is the one place the clock is read for a page, and every relative time on it is told this
 * moment rather than its own.
 */
export function readPhiRenderMoment() {
  return Date.now();
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
 *
 * `now` is the caller's, never read here: a Client component hands over the moment the server rendered
 * the page (`usePhiIntlRenderedAt()`), so the words it hydrates with are the words the server wrote.
 */
export function formatPhiRelativeTime(value: string | null | undefined, locale: string, now: number) {
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
