import { matchPhiLocalePrefixSegment, normalizeLocale, type SiteLocale } from "./locale";

export type SiteLocaleOption = {
  code: string;
  label: string;
};

export type SiteLocaleConfig = {
  defaultLocale: SiteLocale;
  availableLocales: SiteLocaleOption[];
};

/** What one locale a Site serves means, as Core lists it in the Site config (`localeCapabilities`). */
export type PhiLocaleCapability = {
  locale: string;
  language: string;
  script?: string;
  region?: string;
  direction: "ltr" | "rtl";
  intlLocale: string;
  deeplTargetLang?: string;
  labelFallbacks: string[];
};

export type PhiResolvedLocale = PhiLocaleCapability & {
  requestedLocale: string | null;
  source?: "requested" | "user" | "cookie" | "browser" | "default";
};

/**
 * A request's locale where the request names one the Site serves, or null where Core has to decide.
 *
 * Core matches the requested locale before the person's choice, the cookie and the browser, so a locale
 * the Site serves under exactly that code answers the same whoever asks. Anything else -- no locale, or
 * one Core would only match by language -- is Core's to resolve.
 */
export function resolvePhiRequestedSiteLocale(
  requestedLocale: string | null,
  capabilities: readonly PhiLocaleCapability[],
): PhiResolvedLocale | null {
  const requested = requestedLocale?.trim().toLowerCase();
  if (!requested) return null;
  const capability = capabilities.find((entry) => entry.locale.toLowerCase() === requested);
  return capability ? { ...capability, requestedLocale: requestedLocale!.trim(), source: "requested" } : null;
}

export function normalizeSiteLocale(input: string | null | undefined, config: SiteLocaleConfig): SiteLocale {
  return normalizeLocale(input, {
    defaultLocale: config.defaultLocale,
    availableLocales: config.availableLocales.map((option) => option.code),
  });
}

export function extractLocalePrefix(pathname: string, config: SiteLocaleConfig): SiteLocale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!firstSegment) {
    return null;
  }

  // The segment is lowercased and a Site's tag keeps its case (`pt-BR`), so the two are compared alike.
  return matchPhiLocalePrefixSegment(firstSegment, {
    defaultLocale: config.defaultLocale,
    availableLocales: config.availableLocales.map((option) => option.code),
  });
}
