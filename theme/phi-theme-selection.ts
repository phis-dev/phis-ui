import { PHI_DEFAULT_THEME_PRESET_KEY } from "./phi-theme-presets";

const PHI_SITE_THEME_SELECTION_PREFIX = "site:";

export function createPhiSiteThemeSelectionValue(siteKey: string) {
  const normalizedSiteKey = siteKey.trim();
  if (!normalizedSiteKey) {
    throw new Error("Site theme selection requires a site key.");
  }
  return `${PHI_SITE_THEME_SELECTION_PREFIX}${normalizedSiteKey}`;
}

export function isPhiSiteThemeSelectionValue(value: string, siteKey: string) {
  return value === createPhiSiteThemeSelectionValue(siteKey);
}

export function resolvePhiThemeSelectionValue(
  siteKey: string,
  hasSiteThemeRevision: boolean,
) {
  if (hasSiteThemeRevision) {
    return createPhiSiteThemeSelectionValue(siteKey);
  }
  return PHI_DEFAULT_THEME_PRESET_KEY;
}
