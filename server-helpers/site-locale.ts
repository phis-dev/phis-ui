import "server-only";

import { DEFAULT_LOCALE, normalizeLocale } from "../helpers/locale";
import { resolvePhiRuntimeConfig } from "../helpers/phis-runtime";
import type {
  PhiResolvedLocale,
  SiteLocaleConfig,
  SiteLocaleOption,
} from "../helpers/site-locale-config";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";

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

const CACHE_TTL_MS = 3_600_000;
const configCache = new Map<string, { config: SiteLocaleConfig; cachedAt: number }>();

function buildCacheKey(options: FetchSiteLocaleConfigOptions) {
  const runtime = resolvePhiRuntimeConfig(options, {
    context: "fetchSiteLocaleConfig cache",
    requireSiteKey: true,
  });
  return [runtime.apiBaseUrl, runtime.internalToken, runtime.siteKey ?? ""].join("::");
}

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
      const code = normalizeLocale(value, { defaultLocale });
      if (code) normalized.push({ code, label: buildLocaleLabel(code) });
      continue;
    }
    if (value && typeof value === "object") {
      const record = value as { code?: unknown; label?: unknown };
      const code = typeof record.code === "string"
        ? normalizeLocale(record.code, { defaultLocale })
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
    ? normalizeLocale(record.defaultLocale, { defaultLocale: DEFAULT_LOCALE })
    : DEFAULT_LOCALE;
  const availableLocales = normalizeLocaleOptions(record.availableLocales, fallbackDefaultLocale);
  return {
    defaultLocale: availableLocales.some((option) => option.code === fallbackDefaultLocale)
      ? fallbackDefaultLocale
      : availableLocales[0]?.code ?? DEFAULT_LOCALE,
    availableLocales,
  };
}

export async function fetchSiteLocaleConfig(
  options: FetchSiteLocaleConfigOptions = {},
): Promise<SiteLocaleConfig> {
  const now = Date.now();
  const cacheKey = buildCacheKey(options);
  const cached = configCache.get(cacheKey);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) return cached.config;

  const resolvedRuntime = resolvePhiRuntimeConfig(options, {
    context: "fetchSiteLocaleConfig",
    requireSiteKey: true,
  });
  const response = await fetch(`${resolvedRuntime.apiBaseUrl}/api/v1/site`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${resolvedRuntime.internalToken}`,
      [PHIS_SITE_KEY_HEADER]: resolvedRuntime.siteKey as string,
      "user-agent": "phis-ui-locale-config/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Site locale config fetch failed (${response.status}).`);

  const config = sanitizeSiteLocaleConfig(await response.json());
  configCache.set(cacheKey, { config, cachedAt: now });
  return config;
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
