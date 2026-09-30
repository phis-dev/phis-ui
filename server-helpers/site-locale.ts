import "server-only";

import { PHI_CANONICAL_SOURCE_LOCALE, canonicalizePhiLocaleTag } from "../helpers/locale";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import type {
  PhiResolvedLocale,
  SiteLocaleConfig,
  SiteLocaleOption,
} from "../helpers/site-locale-config";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";
import { getResolvedSiteConfig } from "../gateway/site-config";

export type FetchSiteLocaleConfigOptions = {
  apiBaseUrl?: string;
  internalToken?: string;
  siteKey?: string;
};

export type FetchResolvedSiteLocaleOptions = FetchSiteLocaleConfigOptions & {
  requestedLocale?: string | null;
  acceptLanguage?: string | null;
  cookieHeader?: string | null;
};

function capitalizeLocaleLabel(value: string) {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function buildLocaleLabel(code: string, displayLocale = code) {
  const normalized = code.trim();
  if (!normalized) return code.toUpperCase();
  try {
    const display = new Intl.DisplayNames([displayLocale], { type: "language" }).of(normalized);
    return display ? capitalizeLocaleLabel(display) : normalized.toUpperCase();
  } catch {
    return normalized.toUpperCase();
  }
}

function normalizeLocaleOptions(input: unknown, defaultLocale: string) {
  if (!Array.isArray(input)) {
    return [{ code: defaultLocale, label: buildLocaleLabel(defaultLocale) }];
  }

  const normalized: SiteLocaleOption[] = [];
  for (const value of input) {
    if (typeof value === "string") {
      const code = canonicalizePhiLocaleTag(value);
      if (code) normalized.push({ code, label: buildLocaleLabel(code) });
      continue;
    }
    if (value && typeof value === "object") {
      const record = value as { code?: unknown; label?: unknown };
      const code = typeof record.code === "string"
        ? canonicalizePhiLocaleTag(record.code)
        : "";
      if (!code) continue;
      normalized.push({
        code,
        label: typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : buildLocaleLabel(code),
      });
    }
  }

  if (normalized.length === 0) {
    return [{ code: defaultLocale, label: buildLocaleLabel(defaultLocale) }];
  }
  const seen = new Set<string>();
  return normalized.filter((option) => {
    if (seen.has(option.code)) return false;
    seen.add(option.code);
    return true;
  });
}

function sanitizeSiteLocaleConfig(payload: unknown): SiteLocaleConfig {
  const site = payload && typeof payload === "object" ? (payload as { site?: unknown }).site : null;
  const record = site && typeof site === "object"
    ? (site as { defaultLocale?: unknown; availableLocales?: unknown })
    : {};
  const fallbackDefaultLocale = typeof record.defaultLocale === "string"
    ? canonicalizePhiLocaleTag(record.defaultLocale) || PHI_CANONICAL_SOURCE_LOCALE
    : PHI_CANONICAL_SOURCE_LOCALE;
  const availableLocales = normalizeLocaleOptions(record.availableLocales, fallbackDefaultLocale);
  return {
    defaultLocale: availableLocales.some((option) => option.code === fallbackDefaultLocale)
      ? fallbackDefaultLocale
      : availableLocales[0]?.code ?? PHI_CANONICAL_SOURCE_LOCALE,
    availableLocales,
  };
}

/**
 * The Site's languages, read from the Site config rather than cached beside it.
 *
 * They arrive in the same `/api/v1/site` answer, and a cache of their own kept them for an hour while
 * the config around them refreshed every two seconds: a language added in Admin was a page path for the
 * router until then, and `/fr/...` was forwarded to `/de/fr/...`. The config's cache is also the one a
 * write through the Site proxy and a moved read marker clear.
 */
export async function fetchSiteLocaleConfig(
  options: FetchSiteLocaleConfigOptions = {},
): Promise<SiteLocaleConfig> {
  const resolvedRuntime = resolvePhiRuntimeConfig(options, {
    context: "fetchSiteLocaleConfig",
    requireSiteKey: true,
  });
  const site = await getResolvedSiteConfig({
    apiBaseUrl: resolvedRuntime.apiBaseUrl,
    internalToken: resolvedRuntime.internalToken,
    siteKey: resolvedRuntime.siteKey as string,
  });
  return sanitizeSiteLocaleConfig({ site });
}

export async function fetchResolvedSiteLocale(
  options: FetchResolvedSiteLocaleOptions = {},
): Promise<PhiResolvedLocale> {
  const resolvedRuntime = resolvePhiRuntimeConfig(options, {
    context: "fetchResolvedSiteLocale",
    requireSiteKey: true,
  });
  const url = new URL(`${resolvedRuntime.apiBaseUrl}/api/v1/site/locale`);
  if (options.requestedLocale?.trim()) url.searchParams.set("locale", options.requestedLocale.trim());

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${resolvedRuntime.internalToken}`,
    [PHIS_SITE_KEY_HEADER]: resolvedRuntime.siteKey as string,
    "user-agent": "phis-ui-locale-resolution/1.0",
  };
  if (options.acceptLanguage?.trim()) headers["accept-language"] = options.acceptLanguage.trim();
  if (options.cookieHeader?.trim()) headers.cookie = options.cookieHeader.trim();

  const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Site locale resolution failed (${response.status}).`);

  const payload = (await response.json()) as { locale?: PhiResolvedLocale };
  if (!payload.locale) throw new Error("Missing resolved site locale payload.");
  return payload.locale;
}
