import { describe, expect, it } from "vitest";

import {
  PHI_SITE_LOCALES_CONFIG_KEY,
  readPhiSiteLocaleOptions,
} from "./site-locales-config";

/**
 * The languages a Settings panel offers, against what the Page handed it.
 *
 * The list cannot be in the Form descriptor: that is registered once and reads the same on every Site,
 * while the languages are the Site's. It travels in the placement's config instead, which is the one
 * route that reaches the field during the render -- a provider that fetched would leave the select
 * empty in the HTML and fill it after hydration. So what is pinned here is that the field reads the
 * placement, and reads it defensively: the value crossed a Server/Client boundary as plain JSON.
 */

describe("the locales a placement hands to a field", () => {
  it("offers what the Page put in its config", () => {
    expect(readPhiSiteLocaleOptions({
      [PHI_SITE_LOCALES_CONFIG_KEY]: [
        { code: "de", label: "Deutsch" },
        { code: "en", label: "English" },
      ],
    })).toEqual([
      { value: "de", label: "Deutsch" },
      { value: "en", label: "English" },
    ]);
  });

  it("falls back to the code where a locale has no translated name", () => {
    expect(readPhiSiteLocaleOptions({
      [PHI_SITE_LOCALES_CONFIG_KEY]: [{ code: "fr", label: "   " }, { code: "it" }],
    })).toEqual([
      { value: "fr", label: "fr" },
      { value: "it", label: "it" },
    ]);
  });

  it("is an empty list rather than a broken one where the config says nothing usable", () => {
    expect(readPhiSiteLocaleOptions(null)).toEqual([]);
    expect(readPhiSiteLocaleOptions({})).toEqual([]);
    expect(readPhiSiteLocaleOptions({ [PHI_SITE_LOCALES_CONFIG_KEY]: "de,en" })).toEqual([]);
    expect(readPhiSiteLocaleOptions({
      [PHI_SITE_LOCALES_CONFIG_KEY]: [null, "de", { label: "No code" }, { code: "  " }],
    })).toEqual([]);
  });
});
