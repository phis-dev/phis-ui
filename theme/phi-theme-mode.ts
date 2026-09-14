import type { PhiThemeMode } from "./phi-theme-presets";

/**
 * How a viewer wants to see a Site. It is never part of a Theme: a Theme record and its drafts carry
 * only light or dark, the half of the Theme being authored. `system` exists only here, as a person's
 * preference - stored in their user settings once those exist - or as the browser speaking for them.
 */
export type PhiThemeModePreference = PhiThemeMode | "system";

/**
 * The preference of a viewer who has stated none, which today is every viewer: follow the browser.
 * A stored user setting is meant to replace this value where it is read.
 */
export const PHI_DEFAULT_THEME_MODE_PREFERENCE: PhiThemeModePreference = "system";

/**
 * Carries the browser's `prefers-color-scheme` answer from one request to the next, so a viewer on
 * `system` is rendered in the right projection server-side instead of correcting itself after
 * hydration. It holds what the browser reported, never what a person chose.
 */
export const PHI_COLOR_SCHEME_COOKIE = "phis_color_scheme";

export function normalizePhiThemeModePreference(value: unknown): PhiThemeModePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Reads the cookie value written by the bootstrap script; anything else means "not asked yet". */
export function normalizePhiColorSchemeHint(value: unknown): PhiThemeMode | null {
  return value === "dark" || value === "light" ? value : null;
}

/**
 * The one place that decides what a viewer is shown before anyone overrides it live. A stated light
 * or dark preference is kept; `system` follows the browser and falls back to light when the browser
 * states nothing or has not been asked yet. The Theme record's own mode takes no part: a live
 * `themeMode` or `theme` signal - the Builder's switch, a draft preview - is what overrides this, in
 * any Area, and only for as long as the page stays open.
 */
export function resolvePhiThemeMode(
  preference: unknown,
  browserHint?: PhiThemeMode | null,
): PhiThemeMode {
  const normalized = normalizePhiThemeModePreference(preference);

  if (normalized !== "system") {
    return normalized;
  }

  return browserHint ?? "light";
}

/**
 * Inline script for the document head, emitted only for a viewer on `system`. It marks the root
 * element before first paint and writes the hint cookie, so the very next request already renders
 * the right projection: the first view may still swing once, every later navigation is quiet.
 */
export function buildPhiThemeModeBootstrapScript(preference: PhiThemeModePreference): string | null {
  if (preference !== "system") {
    return null;
  }

  return `(function(){try{` +
    `var d=window.matchMedia('(prefers-color-scheme: dark)').matches;` +
    `var m=d?'dark':'light';` +
    `var r=document.documentElement;` +
    `r.dataset.phiThemeMode=m;` +
    `r.style.colorScheme=m;` +
    `if(document.cookie.indexOf('${PHI_COLOR_SCHEME_COOKIE}='+m)<0){` +
    `document.cookie='${PHI_COLOR_SCHEME_COOKIE}='+m+';path=/;max-age=31536000;samesite=lax';}` +
    `}catch(e){}})();`;
}

/**
 * Client-side counterpart of the bootstrap script, for a system preference that changes while the
 * page is open. Writing the hint here keeps the next server render in step with what is on screen.
 */
export function writePhiColorSchemeHint(mode: PhiThemeMode): void {
  document.cookie =
    `${PHI_COLOR_SCHEME_COOKIE}=${mode};path=/;max-age=31536000;samesite=lax`;
}

/** Keeps `<html>` in step with the projection on screen, including after a live Theme signal. */
export function applyPhiThemeModeToDocument(mode: PhiThemeMode): void {
  const root = document.documentElement;
  root.dataset.phiThemeMode = mode;
  root.style.colorScheme = mode;
}

/**
 * Picks the hint out of a raw `Cookie` request header, for the server helpers that are handed one
 * instead of reaching for `next/headers` themselves.
 */
export function readPhiColorSchemeHintFromCookieHeader(
  cookieHeader?: string | null,
): PhiThemeMode | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }

    if (part.slice(0, separator).trim() === PHI_COLOR_SCHEME_COOKIE) {
      return normalizePhiColorSchemeHint(part.slice(separator + 1).trim());
    }
  }

  return null;
}
