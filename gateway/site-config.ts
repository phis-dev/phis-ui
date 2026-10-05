import "server-only";

import { syncPhiTranslationChangeMarkers } from "../helpers/translation-cache";
import { clearPhiSiteReadCache, readPhiSiteReadCache } from "./site-read-cache";
import { fetchPhiSiteApi } from "./site-api-request";
import type { PhiSiteConfig } from "../types/site-config";

export type GetResolvedSiteConfigOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
};

/**
 * How long a Site process keeps its config before asking Core again. The config is small and carries the
 * change markers, so this is also how long a process can go on showing what another process's publish
 * already replaced: it asks at most this often however many renders it serves, and not while it serves none.
 */
export const PHI_SITE_CONFIG_REFRESH_MS = 3_000;

const READ_MARKERS_KEY = Symbol.for("phis-ui.site-read-markers");

/** The read marker this process last saw per Site, on `globalThis` for the reason the read cache is. */
function readSeenMarkers(): Map<string, string> {
  const holder = globalThis as typeof globalThis & { [READ_MARKERS_KEY]?: Map<string, string> };
  holder[READ_MARKERS_KEY] ??= new Map();
  return holder[READ_MARKERS_KEY];
}

/**
 * The Site's config as Core publishes it. Kept in the Site process's read cache outside development
 * (gateway/site-read-cache.ts) for `PHI_SITE_CONFIG_REFRESH_MS`, never in Next's data cache.
 */
export async function getResolvedSiteConfig({
  apiBaseUrl,
  internalToken,
  siteKey,
}: GetResolvedSiteConfigOptions): Promise<PhiSiteConfig> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for getResolvedSiteConfig.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for getResolvedSiteConfig.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for getResolvedSiteConfig.");
  }

  const cacheKey = `site-config:${siteKey.trim().toLowerCase()}`;
  const load = () => fetchSiteConfig({ apiBaseUrl, internalToken, siteKey }, cacheKey);
  if (process.env.NODE_ENV === "development") {
    return load();
  }
  return readPhiSiteReadCache(cacheKey, load, PHI_SITE_CONFIG_REFRESH_MS);
}

async function fetchSiteConfig(
  { apiBaseUrl, internalToken, siteKey }: GetResolvedSiteConfigOptions,
  cacheKey: string,
): Promise<PhiSiteConfig> {
  const payload = await fetchPhiSiteApi<{ site?: PhiSiteConfig }>({
    context: "fetchSiteConfig",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site",
    failure: "Failed to fetch site config",
  });
  if (!payload?.site) {
    throw new Error("Missing site config payload.");
  }

  if (!payload.site.translationMarkers) {
    throw new Error("Missing translation markers in site config payload.");
  }
  // Every fresh answer, cached or not afterwards, is where this process learns a translation changed.
  syncPhiTranslationChangeMarkers({
    siteKey,
    global: payload.site.translationMarkers.global,
    site: payload.site.translationMarkers.site,
  });
  // ... and that something published changed, possibly through another process: the rest of the read
  // cache goes, this answer stays.
  if (!payload.site.readMarker) {
    throw new Error("Missing read marker in site config payload.");
  }
  const seen = readSeenMarkers();
  const markerKey = siteKey.trim().toLowerCase();
  const previous = seen.get(markerKey);
  seen.set(markerKey, payload.site.readMarker);
  if (previous !== undefined && previous !== payload.site.readMarker) {
    clearPhiSiteReadCache({ keep: cacheKey });
  }
  return payload.site;
}
