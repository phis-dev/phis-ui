import { describe, expect, it } from "vitest";

import { isPhiLocaleReadableAsSource, resolvePhiTranslationLocale } from "./locale";

/**
 * What a translation lookup asks for and when it asks at all. Shortened to the language, `zh-Hant` was
 * looked up as `zh` -- which the Server reads as Simplified -- and counted as the `zh` source itself.
 */
describe("the locale a translation lookup carries", () => {
  it("keeps script and region, so the Server can tell the variants apart", () => {
    expect(resolvePhiTranslationLocale("zh-Hant")).toBe("zh-Hant");
    expect(resolvePhiTranslationLocale("pt_BR")).toBe("pt-BR");
    expect(resolvePhiTranslationLocale("de-AT,de;q=0.8")).toBe("de-AT");
  });

  it("falls back to the canonical source locale for nothing usable", () => {
    expect(resolvePhiTranslationLocale("")).toBe(resolvePhiTranslationLocale(undefined));
  });
});

describe("whether a locale reads the source as it is", () => {
  it("ignores the region", () => {
    expect(isPhiLocaleReadableAsSource("en-US", "en")).toBe(true);
    expect(isPhiLocaleReadableAsSource("de-AT", "de")).toBe(true);
  });

  it("does not ignore the script", () => {
    expect(isPhiLocaleReadableAsSource("zh-Hant", "zh")).toBe(false);
    expect(isPhiLocaleReadableAsSource("zh-Hans", "zh")).toBe(true);
    expect(isPhiLocaleReadableAsSource("sr-Latn", "sr")).toBe(false);
  });

  it("tells different languages apart", () => {
    expect(isPhiLocaleReadableAsSource("fr", "en")).toBe(false);
  });
});
