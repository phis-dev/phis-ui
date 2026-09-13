import { describe, expect, it } from "vitest";

import {
  buildPhiPublicPageAlternates,
  collectPhiSitemapCandidates,
  renderPhiRobotsTxt,
  renderPhiSitemapXml,
  resolvePhiSitePublicBase,
} from "./phi-seo";

describe("the Site's public base", () => {
  it("takes the first absolute http(s) URL, without a trailing slash", () => {
    expect(resolvePhiSitePublicBase("", "  ", "https://phis.dev/")).toBe("https://phis.dev");
    expect(resolvePhiSitePublicBase("https://phis.dev/site/", "https://other.dev")).toBe("https://phis.dev/site");
  });

  it("is absent rather than guessed when nothing absolute was configured", () => {
    expect(resolvePhiSitePublicBase(undefined, null, "phis.dev", "ftp://phis.dev")).toBeNull();
  });
});

/*
 * hreflang is only honoured when it is reciprocal, so every language version has to name the same set.
 * These say that the set does not depend on which version is asking.
 */
describe("the language versions of a Public Page", () => {
  const site = { publicBase: "https://phis.dev", availableLocales: ["de", "en"], defaultLocale: "en" };

  it("is canonical to itself and names the same set from every version", () => {
    const de = buildPhiPublicPageAlternates({ ...site, path: "/", locale: "de" });
    const en = buildPhiPublicPageAlternates({ ...site, path: "/", locale: "en" });

    expect(de?.canonical).toBe("https://phis.dev/de");
    expect(en?.canonical).toBe("https://phis.dev/en");
    expect(de?.languages).toEqual(en?.languages);
    expect(de?.languages).toEqual({
      de: "https://phis.dev/de",
      en: "https://phis.dev/en",
      "x-default": "https://phis.dev/en",
    });
  });

  it("lists one url per Page per locale, each with the whole set", () => {
    const xml = renderPhiSitemapXml([{ path: "/a&b", lastModified: "2026-09-01T10:00:00.000Z" }], site);

    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.match(/hreflang="x-default"/g)).toHaveLength(2);
    expect(xml).toContain("<loc>https://phis.dev/de/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-09-01T10:00:00.000Z</lastmod>");
  });
});

describe("the sitemap's candidates", () => {
  it("asks about the Area root, every exact Module route and every published Page, once each", () => {
    const candidates = collectPhiSitemapCandidates({
      moduleRoutes: [
        ["/login", { ownerModuleId: "@phis/auth", presetKey: "login" }],
        ["/shop", { ownerModuleId: "@phis/store", presetKey: "shop" }],
      ],
      publishedPages: [
        { path: null, ownerModuleId: "@phis/store", presetKey: "shop", publishedAt: "2026-09-02T00:00:00.000Z" },
        { path: "/kontakt", ownerModuleId: null, presetKey: null, publishedAt: "2026-09-01T00:00:00.000Z" },
        { path: "/", ownerModuleId: null, presetKey: null, publishedAt: "2026-08-01T00:00:00.000Z" },
      ],
    });

    expect(candidates).toEqual([
      { path: "/", lastModified: "2026-08-01T00:00:00.000Z" },
      { path: "/kontakt", lastModified: "2026-09-01T00:00:00.000Z" },
      // A Module Page nobody stored has no revision to date it by.
      { path: "/login" },
      // A stored Module Page is dated by its preset identity, because it has no path of its own.
      { path: "/shop", lastModified: "2026-09-02T00:00:00.000Z" },
    ]);
  });
});

describe("robots.txt", () => {
  it("allows everything, names no Area, and points at the sitemap when there is one", () => {
    const withSitemap = renderPhiRobotsTxt("https://phis.dev/sitemap.xml");

    expect(withSitemap).toBe("User-agent: *\nAllow: /\n\nSitemap: https://phis.dev/sitemap.xml\n");
    expect(withSitemap).not.toContain("Disallow");
    expect(renderPhiRobotsTxt(null)).toBe("User-agent: *\nAllow: /\n");
  });
});
