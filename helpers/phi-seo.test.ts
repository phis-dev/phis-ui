import { describe, expect, it } from "vitest";

import {
  buildPhiPublicPageAlternates,
  collectPhiSitemapCandidates,
  renderPhiRobotsTxt,
  renderPhiSitemapDocuments,
  renderPhiSitemapIndexXml,
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

describe("a sitemap too large for one file", () => {
  const site = { publicBase: "https://phis.dev", availableLocales: ["de", "en"], defaultLocale: "en" };
  const pages = Array.from({ length: 5 }, (_value, index) => ({ path: `/p${index}` }));

  it("closes a file at the URL limit, counting one url per Page per locale", () => {
    const documents = renderPhiSitemapDocuments(pages, site, { maxUrls: 4 });
    expect(documents.map((document) => document.match(/<url>/g)?.length)).toEqual([4, 4, 2]);
    for (const document of documents) {
      expect(document.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(document.trimEnd().endsWith("</urlset>")).toBe(true);
    }
  });

  it("closes a file at the byte limit too", () => {
    const one = renderPhiSitemapDocuments(pages.slice(0, 1), site)[0]!;
    const documents = renderPhiSitemapDocuments(pages, site, { maxBytes: new TextEncoder().encode(one).length });
    expect(documents).toHaveLength(5);
  });

  it("keeps a small Site in one file", () => {
    expect(renderPhiSitemapDocuments(pages, site)).toHaveLength(1);
  });

  it("lists the parts in an index", () => {
    const xml = renderPhiSitemapIndexXml(["https://phis.dev/sitemap.xml?part=1", "https://phis.dev/sitemap.xml?part=2"]);
    expect(xml).toContain("<sitemapindex");
    expect(xml.match(/<sitemap>/g)).toHaveLength(2);
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
