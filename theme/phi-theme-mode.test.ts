import { describe, expect, it } from "vitest";

import {
  PHI_COLOR_SCHEME_COOKIE,
  PHI_THEME_MODE_COOKIE,
  buildPhiThemeModeBootstrapScript,
  readPhiColorSchemeHintFromCookieHeader,
  readPhiThemeModePreferenceFromCookieHeader,
  resolvePhiThemeMode,
} from "./phi-theme-mode";

/**
 * Two cookies, two questions, and the order between them is the whole feature.
 *
 * What a viewer chose and what their browser reported are allowed to disagree -- somebody reading in a
 * dark room on a light Site is why the switch exists -- and everything that renders has to break the
 * tie the same way, the dynamic document, the proxy picking a static render, and the script that runs
 * before first paint. Where they broke it differently, a viewer chose light and the next page came
 * back dark.
 */
describe("theme mode resolution", () => {
  it("lets a stated preference outrank the browser", () => {
    expect(resolvePhiThemeMode("light", "dark")).toBe("light");
    expect(resolvePhiThemeMode("dark", "light")).toBe("dark");
  });

  it("follows the browser where nothing was stated, and lands on light where it said nothing", () => {
    expect(resolvePhiThemeMode("system", "dark")).toBe("dark");
    expect(resolvePhiThemeMode("system", null)).toBe("light");
  });

  it("reads the two cookies apart", () => {
    const header = "phis_theme_mode=light; phis_color_scheme=dark; phis_locale=de";

    expect(readPhiThemeModePreferenceFromCookieHeader(header)).toBe("light");
    expect(readPhiColorSchemeHintFromCookieHeader(header)).toBe("dark");
    expect(readPhiThemeModePreferenceFromCookieHeader("phis_color_scheme=dark")).toBe("system");
  });

  it("leaves a stated preference alone before first paint", () => {
    const script = buildPhiThemeModeBootstrapScript("system");

    // The script marks the root from the browser only after finding no preference to respect.
    expect(script).toBeTypeOf("string");
    expect(script!.indexOf(PHI_THEME_MODE_COOKIE))
      .toBeLessThan(script!.indexOf("dataset.phiThemeMode"));
    // And it writes nothing for that viewer either: the check comes before the cookie it guards.
    expect(script!.indexOf(PHI_THEME_MODE_COOKIE))
      .toBeLessThan(script!.indexOf(`${PHI_COLOR_SCHEME_COOKIE}=dark`));
    // A viewer who stated one is rendered in it, so there is nothing for a script to correct.
    expect(buildPhiThemeModeBootstrapScript("light")).toBeNull();
  });

  /**
   * The hint is storage in somebody's device, so it exists only where it changes an answer: `dark`,
   * for the visit it helps. Light is what its absence already means, which is why the other branch
   * deletes -- including the year-long cookie earlier versions left behind.
   */
  it("stores the hint only for dark, and only for the visit", () => {
    const script = buildPhiThemeModeBootstrapScript("system")!;

    expect(script).toContain(`${PHI_COLOR_SCHEME_COOKIE}=dark;path=/;samesite=lax`);
    expect(script).toContain(`${PHI_COLOR_SCHEME_COOKIE}=;path=/;max-age=0`);
    expect(script).not.toContain("max-age=31536000");
    expect(script).not.toContain(`${PHI_COLOR_SCHEME_COOKIE}=light`);
  });
});
