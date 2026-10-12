import { describe, expect, it } from "vitest";

import { resolvePhiRequestedSiteLocale, type PhiLocaleCapability } from "./site-locale-config";

const capabilities: PhiLocaleCapability[] = [
  { locale: "de", language: "de", direction: "ltr", intlLocale: "de-DE", labelFallbacks: ["de", "en"] },
  { locale: "pt-BR", language: "pt", region: "BR", direction: "ltr", intlLocale: "pt-BR", labelFallbacks: ["pt-BR", "pt", "en"] },
];

/*
 * A request naming a served locale is answered here rather than by Core; everything else stays Core's,
 * because the visitor's own preference then decides and that needs the Session.
 */
describe("the requested Site locale", () => {
  it("is the served locale's entry, as Core would answer it", () => {
    expect(resolvePhiRequestedSiteLocale("pt-br", capabilities)).toEqual({
      ...capabilities[1], requestedLocale: "pt-br", source: "requested",
    });
  });

  it("is left to Core without a locale or with one only a language match would find", () => {
    expect(resolvePhiRequestedSiteLocale(null, capabilities)).toBeNull();
    expect(resolvePhiRequestedSiteLocale(" ", capabilities)).toBeNull();
    expect(resolvePhiRequestedSiteLocale("de-CH", capabilities)).toBeNull();
  });
});
