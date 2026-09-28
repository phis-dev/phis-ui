import { describe, expect, it } from "vitest";

import { canonicalizePhiLocaleTag } from "./locale";
import { extractLocalePrefix, normalizeSiteLocale, type SiteLocaleConfig } from "./site-locale-config";

/**
 * A Site's locales keep their region and script. Shortened to the language, `pt-BR` stopped matching
 * the locale a visitor was resolved to, and a Site offering `de` and `de-AT` lost one of them.
 */
describe("a Site's regional locales", () => {
  it("keep every subtag and only get their spelling fixed", () => {
    expect(canonicalizePhiLocaleTag("pt-BR")).toBe("pt-BR");
    expect(canonicalizePhiLocaleTag("zh_hant")).toBe("zh-Hant");
    expect(canonicalizePhiLocaleTag(" de-at ")).toBe("de-AT");
    expect(canonicalizePhiLocaleTag("")).toBe("");
    expect(canonicalizePhiLocaleTag("not a tag!")).toBe("");
  });

  const config: SiteLocaleConfig = {
    defaultLocale: "de",
    availableLocales: [
      { code: "de", label: "Deutsch" },
      { code: "de-AT", label: "Österreichisch" },
      { code: "pt-BR", label: "Português" },
    ],
  };

  it("are found in the address whatever its case", () => {
    expect(extractLocalePrefix("/pt-br/team", config)).toBe("pt-BR");
    expect(extractLocalePrefix("/de-at/team", config)).toBe("de-AT");
    expect(extractLocalePrefix("/de/team", config)).toBe("de");
  });

  it("resolve a visitor to the Site's own tag, the regional one where it exists", () => {
    expect(normalizeSiteLocale("de-AT,de;q=0.8", config)).toBe("de-AT");
    expect(normalizeSiteLocale("pt", config)).toBe("pt-BR");
  });
});
