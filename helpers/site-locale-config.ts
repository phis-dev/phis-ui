import { normalizeLocale, type SiteLocale } from "./locale";

export type SiteLocaleOption = {
  code: string;
  label: string;
};

export type SiteLocaleConfig = {
  defaultLocale: SiteLocale;
  availableLocales: SiteLocaleOption[];
};

export type PhiResolvedLocale = {
  requestedLocale: string | null;
  locale: string;
  language: string;
  script?: string;
  region?: string;
  direction: "ltr" | "rtl";
  intlLocale: string;
  deeplTargetLang?: string;
  labelFallbacks: string[];
  source?: "requested" | "user" | "cookie" | "browser" | "default";
};

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

  const matched = normalizeSiteLocale(firstSegment, config);
  if (firstSegment === matched || firstSegment.startsWith(`${matched}-`)) {
    return matched;
  }

  return null;
}
