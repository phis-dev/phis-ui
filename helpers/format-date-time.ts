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
