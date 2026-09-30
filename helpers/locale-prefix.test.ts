import { describe, expect, it } from "vitest";

import { localizePath, matchPhiLocalePrefixSegment, phiAreaPath, stripLocaleFromPathname } from "./locale";

const options = { defaultLocale: "en", availableLocales: ["en", "de", "de-AT", "pt-BR"] };

describe("matchPhiLocalePrefixSegment", () => {
  it("answers the Site's spelling of a locale segment, compared without case", () => {
    expect(matchPhiLocalePrefixSegment("de", options)).toBe("de");
    expect(matchPhiLocalePrefixSegment("pt-br", options)).toBe("pt-BR");
    expect(matchPhiLocalePrefixSegment("DE-at", options)).toBe("de-AT");
  });

  it("accepts a regional form of a listed locale", () => {
    expect(matchPhiLocalePrefixSegment("en-gb", options)).toBe("en");
    expect(matchPhiLocalePrefixSegment("de-latn-ch", options)).toBe("de");
    expect(matchPhiLocalePrefixSegment("en-419", options)).toBe("en");
  });

  it("refuses a page that only starts with a locale and a hyphen", () => {
    expect(matchPhiLocalePrefixSegment("de-facto", options)).toBeNull();
    expect(matchPhiLocalePrefixSegment("de-", options)).toBeNull();
    expect(matchPhiLocalePrefixSegment("en-gb-x", options)).toBeNull();
  });

  it("refuses a segment that only resolves to the default locale", () => {
    expect(matchPhiLocalePrefixSegment("admin", options)).toBeNull();
    expect(matchPhiLocalePrefixSegment("fr", options)).toBeNull();
    expect(matchPhiLocalePrefixSegment("", options)).toBeNull();
  });

  it("keeps the language of an unlisted tag where the Site lists none", () => {
    expect(matchPhiLocalePrefixSegment("fr-ca", {})).toBe("fr");
  });
});

describe("stripLocaleFromPathname", () => {
  it("strips a locale segment and leaves any other path alone", () => {
    expect(stripLocaleFromPathname("/de/team", options)).toBe("/team");
    expect(stripLocaleFromPathname("/pt-br", options)).toBe("/");
    expect(stripLocaleFromPathname("/admin/users", options)).toBe("/admin/users");
  });
});

describe("localizePath and phiAreaPath", () => {
  it("prefix a path with the locale or the normalized Area", () => {
    expect(localizePath("de", "/")).toBe("/de");
    expect(localizePath("de", "")).toBe("/de");
    expect(localizePath("de", "/team")).toBe("/de/team");
    expect(localizePath("de", "team")).toBe("/de/team");
    expect(phiAreaPath(" Admin ", "/users")).toBe("/admin/users");
    expect(phiAreaPath("admin", "/")).toBe("/admin");
  });

  it("pass an absolute URL through", () => {
    expect(localizePath("de", "https://example.com/x")).toBe("https://example.com/x");
    expect(phiAreaPath("admin", "http://example.com")).toBe("http://example.com");
  });
});
