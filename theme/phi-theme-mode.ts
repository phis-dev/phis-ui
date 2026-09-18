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

/**
 * What a viewer chose, as against what their browser reported. Absent means they have chosen nothing
 * and follow the browser, which is why `system` is stored by deleting it rather than as a third value.
 *
 * It is a second cookie rather than a second meaning for the first, because the two answer different
 * questions and the answers can disagree -- somebody reading in a dark room on a light Site is the
 * whole point of a switch. One value carrying both could not say which of them was the decision.
 */
export const PHI_THEME_MODE_COOKIE = "phis_theme_mode";

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
 * Inline script for the document head, emitted only for a viewer the render believes is on `system`.
 * It marks the root element before first paint and writes the hint cookie, so the very next request
 * already renders the right projection: the first view may still swing once, every later navigation
 * is quiet.
 *
 * It asks for the stated preference itself because one render cannot be told it. The static tree is
 * one document per locale and mode and reads nothing of the request (`createPhiNextStaticRootLayout`);
 * the proxy picks which of the two a viewer is served, preference first. Marking the root from the
 * browser's answer alone would undo exactly that pick -- a viewer who chose light on a dark machine
 * would watch the page turn dark again -- so a stated preference ends the script after the hint,
 * which stays what the browser said and stays worth recording.
 */
export function buildPhiThemeModeBootstrapScript(preference: PhiThemeModePreference): string | null {
  if (preference !== "system") {
    return null;
  }

  return `(function(){try{` +
    `var d=window.matchMedia('(prefers-color-scheme: dark)').matches;` +
    `var m=d?'dark':'light';` +
    `if(document.cookie.indexOf('${PHI_COLOR_SCHEME_COOKIE}='+m)<0){` +
    `document.cookie='${PHI_COLOR_SCHEME_COOKIE}='+m+';path=/;max-age=31536000;samesite=lax';}` +
    `if(/(?:^|;\\s*)${PHI_THEME_MODE_COOKIE}=(?:light|dark)(?:;|$)/.test(document.cookie)){return;}` +
    `var r=document.documentElement;` +
    `r.dataset.phiThemeMode=m;` +
    `r.style.colorScheme=m;` +
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

/**
 * Keeps what a viewer chose, so the next document opens the way the last one closed -- including the
 * static one, which the proxy picks with this cookie before any script of ours runs.
 *
 * Going back to `system` deletes it rather than storing the word, so "follow the browser" is one state
 * everywhere instead of an absent cookie and a stored value that have to be kept saying the same thing.
 */
export function writePhiThemeModePreference(preference: PhiThemeModePreference): void {
  document.cookie = preference === "system"
    ? `${PHI_THEME_MODE_COOKIE}=;path=/;max-age=0;samesite=lax`
    : `${PHI_THEME_MODE_COOKIE}=${preference};path=/;max-age=31536000;samesite=lax`;
}

/** Keeps `<html>` in step with the projection on screen, including after a live Theme signal. */
export function applyPhiThemeModeToDocument(mode: PhiThemeMode): void {
  const root = document.documentElement;
  root.dataset.phiThemeMode = mode;
  root.style.colorScheme = mode;
}

/** One pass over a raw `Cookie` header, for the readers below. */
function readCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return null;
}

/**
 * Picks the hint out of a raw `Cookie` request header, for the server helpers that are handed one
 * instead of reaching for `next/headers` themselves.
 */
export function readPhiColorSchemeHintFromCookieHeader(
  cookieHeader?: string | null,
): PhiThemeMode | null {
  return normalizePhiColorSchemeHint(readCookieValue(cookieHeader, PHI_COLOR_SCHEME_COOKIE));
}

/** The stated preference from the same header; anything but light or dark reads as `system`. */
export function readPhiThemeModePreferenceFromCookieHeader(
  cookieHeader?: string | null,
): PhiThemeModePreference {
  return normalizePhiThemeModePreference(readCookieValue(cookieHeader, PHI_THEME_MODE_COOKIE));
}
