import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "../constants/cms-areas";

export { PHI_CANONICAL_SOURCE_LOCALE } from "@phis/contracts/locale";
import { PHI_CANONICAL_SOURCE_LOCALE } from "@phis/contracts/locale";
export const SUPPORTED_CMS_AREAS = PHI_CMS_AREA_KEYS;

export type SiteLocale = string;
export type SiteArea = PhiCmsAreaKey;

function normalizeAreaSegment(area: SiteArea | string) {
  return area.trim().toLowerCase();
}

export type NormalizeLocaleOptions = {
  defaultLocale?: string | null | undefined;
  availableLocales?: readonly string[] | null | undefined;
};

function normalizeLocaleCode(value: string | null | undefined) {
  return (value ?? "").trim().replace(/_/g, "-");
}

/** A locale as a lookup key: spelling fixed and lower-cased, so `de_AT`, `de-at` and `de-AT` are one key. */
export function normalizePhiLocaleKey(value: string | null | undefined) {
  return normalizeLocaleCode(value).toLowerCase();
}

function normalizeAvailableLocales(availableLocales: readonly string[] | null | undefined) {
  if (!availableLocales?.length) {
    return [];
  }

  return availableLocales
    .map(normalizeLocaleCode)
    .filter((locale): locale is string => Boolean(locale));
}

function matchLocaleCandidate(value: string, availableLocales: readonly string[]) {
  const normalized = normalizeLocaleCode(value);
  if (!normalized) {
    return null;
  }

  const exact = availableLocales.find((locale) => locale.toLowerCase() === normalized.toLowerCase());
  if (exact) {
    return exact;
  }

  const prefix = availableLocales.find(
    (locale) =>
      normalized.toLowerCase().startsWith(`${locale.toLowerCase()}-`) ||
      locale.toLowerCase().startsWith(`${normalized.toLowerCase()}-`),
  );

  return prefix ?? null;
}

/**
 * A locale tag in canonical spelling, with every subtag it came with.
 *
 * `normalizeLocale` without a list shortens a tag to its language, which is right for a visitor's
 * `Accept-Language` and wrong for a Site's own locales: `pt-BR` became `pt`, `zh-Hant` became `zh`, and
 * a Site offering `de` and `de-AT` lost `de-AT`. Whatever resolved a visitor to `pt-BR` then compared
 * it with a list saying `pt` and answered 404. This keeps the tag and only fixes its spelling.
 */
export function canonicalizePhiLocaleTag(input: string | null | undefined) {
  const value = normalizeLocaleCode(input);
  if (!value) return "";
  try {
    return Intl.getCanonicalLocales(value)[0] ?? value;
  } catch {
    return "";
  }
}

/**
 * Whether text in `source` already is text in `locale`, so asking for a translation would be asking
 * for the same words back.
 *
 * Language and script decide it, region does not: `en-US` reads an `en` source as it is, and `zh-Hant`
 * does not read a `zh` (Simplified) one. Lookups used to compare tags shortened to their language,
 * which made `zh-Hant` the source language and handed the Server `zh` -- the Simplified variant.
 */
export function isPhiLocaleReadableAsSource(locale: string, source: string) {
  try {
    const target = new Intl.Locale(canonicalizePhiLocaleTag(locale) || locale).maximize();
    const origin = new Intl.Locale(canonicalizePhiLocaleTag(source) || source).maximize();
    return target.language === origin.language && target.script === origin.script;
  } catch {
    return locale.trim().toLowerCase() === source.trim().toLowerCase();
  }
}

/** The tag a translation lookup carries: whole, so the Server can tell `zh-Hant` from `zh-Hans`. */
export function resolvePhiTranslationLocale(input: string | null | undefined) {
  return canonicalizePhiLocaleTag(input?.split(",")[0]?.split(";")[0]) || PHI_CANONICAL_SOURCE_LOCALE;
}

export function normalizeLocale(
  input: string | null | undefined,
  options: NormalizeLocaleOptions = {},
): SiteLocale {
  const defaultLocale = normalizeLocaleCode(options.defaultLocale) || PHI_CANONICAL_SOURCE_LOCALE;
  const availableLocales = normalizeAvailableLocales(options.availableLocales);

  if (!input) {
    return defaultLocale;
  }

  const chunks = input.split(",");
  for (const chunk of chunks) {
    const candidate = chunk.split(";")[0]?.trim() ?? "";
    if (!candidate) {
      continue;
    }

    if (availableLocales.length > 0) {
      const matched = matchLocaleCandidate(candidate, availableLocales);
      if (matched) {
        return matched;
      }
      continue;
    }

    const normalized = normalizeLocaleCode(candidate);
    if (!normalized) {
      continue;
    }

    return normalized.split("-")[0] ?? defaultLocale;
  }

  return defaultLocale;
}

/** `targetPath` under a first segment; an absolute URL passes through untouched. */
function prefixPath(prefix: string, targetPath: string) {
  if (!targetPath || targetPath === "/") {
    return `/${prefix}`;
  }

  if (/^https?:\/\//i.test(targetPath)) {
    return targetPath;
  }

  if (targetPath.startsWith("/")) {
    return `/${prefix}${targetPath}`;
  }

  return `/${prefix}/${targetPath}`;
}

export function localizePath(locale: SiteLocale | string, targetPath: string) {
  return prefixPath(locale, targetPath);
}

/**
 * The path for a staff Area, which carries no locale prefix.
 *
 * Only the Public Area is localized in the URL; `/admin`, `/builder`, `/editor`, `/accounting` and
 * `/app` are routed by their own segment. A caller that has no locale to offer wants this rather than
 * a locale it had to invent.
 */
export function phiAreaPath(area: SiteArea | string, targetPath: string) {
  return prefixPath(normalizeAreaSegment(area), targetPath);
}

export function localizeAreaPath(
  locale: SiteLocale | string,
  area: SiteArea | string,
  targetPath: string,
) {
  if (normalizeAreaSegment(area) === "public") {
    return localizePath(locale, targetPath);
  }

  return phiAreaPath(area, targetPath);
}

export function resolvePhiNavHref(
  locale: SiteLocale | string,
  currentArea: SiteArea | string,
  href: string,
) {
  const normalizedHref = href.trim();
  if (!normalizedHref) {
    return localizeAreaPath(locale, currentArea, "/");
  }

  if (/^https?:\/\//i.test(normalizedHref)) {
    return normalizedHref;
  }

  const segments = normalizedHref.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();
  if (firstSegment === "public") {
    const publicPath = `/${segments.slice(1).join("/")}` || "/";
    return localizeAreaPath(locale, "public", publicPath);
  }

  if (firstSegment && firstSegment !== "public" && SUPPORTED_CMS_AREAS.includes(firstSegment as SiteArea)) {
    return normalizedHref;
  }

  return localizeAreaPath(locale, currentArea, normalizedHref);
}

const PHI_LOCALE_REGIONAL_SUFFIX = /^(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?$/;

/**
 * The locale a path segment names, or `null` where it names none.
 *
 * The segment is resolved against the Site's locales and must then spell that locale or a regional form
 * of it (`de-at` for `de`), compared without case. Anything else -- an Area, a page -- resolves to the
 * default locale and is refused here, because it does not spell it.
 */
export function matchPhiLocalePrefixSegment(
  segment: string,
  options: Pick<NormalizeLocaleOptions, "defaultLocale" | "availableLocales"> = {},
): SiteLocale | null {
  if (!segment) {
    return null;
  }
  const candidate = normalizeLocale(segment, {
    defaultLocale: options.defaultLocale,
    availableLocales: normalizeAvailableLocales(options.availableLocales),
  });
  const loweredSegment = segment.toLowerCase();
  const loweredCandidate = candidate.toLowerCase();
  if (loweredSegment === loweredCandidate) {
    return candidate;
  }
  /*
   * A regional form is the locale followed by BCP 47 subtags -- a script of four letters, then a region
   * of two letters or three digits -- and nothing else. A page that merely starts with the locale and a
   * hyphen (`de-facto`) is a page, not German.
   */
  return loweredSegment.startsWith(`${loweredCandidate}-`) &&
    PHI_LOCALE_REGIONAL_SUFFIX.test(loweredSegment.slice(loweredCandidate.length))
    ? candidate
    : null;
}

export function stripLocaleFromPathname(
  pathname: string,
  options: Pick<NormalizeLocaleOptions, "defaultLocale" | "availableLocales"> = {},
) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && matchPhiLocalePrefixSegment(segments[0], options)) {
    return `/${segments.slice(1).join("/")}`;
  }

  return pathname;
}

export function stripLocaleAndAreaFromPathname(
  pathname: string,
  options: Pick<NormalizeLocaleOptions, "defaultLocale" | "availableLocales"> = {},
) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment === "public") {
    return `/${segments.slice(1).join("/")}`;
  }

  if (firstSegment && SUPPORTED_CMS_AREAS.includes(firstSegment as SiteArea)) {
    return `/${segments.slice(1).join("/")}`;
  }

  return stripLocaleFromPathname(pathname, options);
}
