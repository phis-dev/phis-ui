import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "../constants/cms-areas";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "de", "fr", "es"] as const;
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

export function normalizeLocale(
  input: string | null | undefined,
  options: NormalizeLocaleOptions = {},
): SiteLocale {
  const defaultLocale = normalizeLocaleCode(options.defaultLocale) || DEFAULT_LOCALE;
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

export function localizePath(locale: SiteLocale | string, targetPath: string) {
  if (!targetPath || targetPath === "/") {
    return `/${locale}`;
  }

  if (/^https?:\/\//i.test(targetPath)) {
    return targetPath;
  }

  if (targetPath.startsWith("/")) {
    return `/${locale}${targetPath}`;
  }

  return `/${locale}/${targetPath}`;
}

export function localizeAreaPath(
  locale: SiteLocale | string,
  area: SiteArea | string,
  targetPath: string,
) {
  const normalizedArea = normalizeAreaSegment(area);

  if (normalizedArea === "public") {
    return localizePath(locale, targetPath);
  }

  if (!targetPath || targetPath === "/") {
    return `/${normalizedArea}`;
  }

  if (/^https?:\/\//i.test(targetPath)) {
    return targetPath;
  }

  if (targetPath.startsWith("/")) {
    return `/${normalizedArea}${targetPath}`;
  }

  return `/${normalizedArea}/${targetPath}`;
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

export function stripLocaleFromPathname(
  pathname: string,
  options: Pick<NormalizeLocaleOptions, "defaultLocale" | "availableLocales"> = {},
) {
  const availableLocales = normalizeAvailableLocales(options.availableLocales);
  const resolvedAvailableLocales = availableLocales.length > 0 ? availableLocales : [...SUPPORTED_LOCALES];
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const localeCandidate = firstSegment
    ? normalizeLocale(firstSegment, {
        defaultLocale: options.defaultLocale,
        availableLocales: resolvedAvailableLocales,
      })
    : null;
  if (
    firstSegment &&
    localeCandidate &&
    (firstSegment.toLowerCase() === localeCandidate.toLowerCase() ||
      firstSegment.toLowerCase().startsWith(`${localeCandidate.toLowerCase()}-`))
  ) {
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
