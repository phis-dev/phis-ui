import type { PhiThemeMode } from "./phi-theme-presets";

/**
 * What a Site configures, as opposed to what is rendered. `PhiThemeMode` stays the resolved
 * light/dark projection every consumer below the root reads; only the Site record and the
 * resolution in this file know that a third choice exists.
 */
export type PhiThemeModeSetting = PhiThemeMode | "system";

/**
 * Carries the browser's `prefers-color-scheme` answer from one request to the next, so a Site set
 * to `system` renders the right projection server-side instead of correcting itself after
 * hydration. It holds what the browser reported, never what a person chose - a stored preference
 * belongs to the user profile and outranks this hint once it exists.
 */
export const PHI_COLOR_SCHEME_COOKIE = "phis_color_scheme";

/**
 * `system` has to be stated. A record without a mode - every Theme written before the third choice
 * existed - keeps rendering light, as it always did; new Sites are created with `system` instead.
 */
export function normalizePhiThemeModeSetting(value: unknown): PhiThemeModeSetting {
  return value === "dark" || value === "system" ? value : "light";
}

/** Reads the cookie value written by the bootstrap script; anything else means "not asked yet". */
export function normalizePhiColorSchemeHint(value: unknown): PhiThemeMode | null {
  return value === "dark" || value === "light" ? value : null;
}

/**
 * The one place that decides what is painted. A Site on light or dark keeps it; `system` follows
 * the browser, and falls back to light when the browser states no preference or has not been asked
 * yet. A stored user preference is meant to enter here as a fourth argument later, ahead of the
 * Site setting.
 */
export function resolvePhiThemeMode(
  setting: unknown,
  browserHint?: PhiThemeMode | null,
): PhiThemeMode {
  const normalized = normalizePhiThemeModeSetting(setting);

  if (normalized !== "system") {
    return normalized;
  }

  return browserHint ?? "light";
}

/**
 * Inline script for the document head, emitted only for a Site on `system`. It marks the root
 * element before first paint and writes the hint cookie, so the very next request already renders
 * the right projection: the first view of a Site may still swing once, every later navigation
 * within it is quiet.
 */
export function buildPhiThemeModeBootstrapScript(setting: PhiThemeModeSetting): string | null {
  if (setting !== "system") {
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
