import "server-only";

export function getSiteConfigCacheTag(siteKey: string) {
  return `site-config:${siteKey.trim().toLowerCase()}`;
}

export function getSiteNavigationCacheTag(siteKey: string, locale?: string) {
  const normalizedSiteKey = siteKey.trim().toLowerCase();
  const normalizedLocale = locale?.trim().toLowerCase();
  return normalizedLocale
    ? `${normalizedSiteKey}:navigation:${normalizedLocale}`
    : `${normalizedSiteKey}:navigation`;
}
