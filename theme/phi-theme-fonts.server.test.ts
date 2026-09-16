import { describe, expect, it, vi } from "vitest";
import { PhiFontSubsetKey, resolvePhiFontPreloadSubsetKeys, type PhiFontCoverage } from "@phis/contracts/media";

vi.mock("server-only", () => ({}));
vi.mock("../gateway/internal-references", () => ({
  resolveSiteInternalReferences: vi.fn(async () => ({
    assets: new Map([[7, {
      id: 7,
      kind: "font",
      title: null,
      originalName: "FiraSans-Regular.ttf",
      contentType: "font/ttf",
      deliveryUrl: "/api/site/media/7/content?r=2",
      deliveryRevision: 2,
      font: {
        format: "sfnt", familyName: "Fira Sans", unitsPerEm: 1000, ascent: 935, descent: -265, lineGap: 0,
        capHeight: 689, xHeight: 527, xWidthAvg: 450, xWidthAvgSource: "glyphs", category: "sans-serif",
        coverage: { subsets: [0, 1, 2, 4, 6], restRanges: [] },
      },
    }]]),
  })),
}));

const { resolvePhiSiteThemeFonts } = await import("./phi-theme-fonts.server");

const FULL: PhiFontCoverage = { subsets: [0, 1, 2, 3, 4, 5, 6, 7, 8], restRanges: [] };
const CONTEXT = { apiBaseUrl: "http://core", internalToken: "t", siteKey: "site" };

describe("resolvePhiFontPreloadSubsetKeys", () => {
  it("preloads Latin alone for a language that needs nothing beyond it", () => {
    expect(resolvePhiFontPreloadSubsetKeys("de-CH", FULL)).toEqual([PhiFontSubsetKey.Latin]);
    expect(resolvePhiFontPreloadSubsetKeys(null, FULL)).toEqual([PhiFontSubsetKey.Latin]);
  });

  it("adds the script cut a language is written in", () => {
    expect(resolvePhiFontPreloadSubsetKeys("pl", FULL)).toEqual([PhiFontSubsetKey.Latin, PhiFontSubsetKey.LatinExt]);
    expect(resolvePhiFontPreloadSubsetKeys("ru-RU", FULL)).toEqual([PhiFontSubsetKey.Latin, PhiFontSubsetKey.Cyrillic]);
    expect(resolvePhiFontPreloadSubsetKeys("el", FULL)).toEqual([PhiFontSubsetKey.Latin, PhiFontSubsetKey.Greek]);
    expect(resolvePhiFontPreloadSubsetKeys("vi", FULL)).toEqual([PhiFontSubsetKey.Latin, PhiFontSubsetKey.Vietnamese]);
  });

  it("lets the script subtag override the language's usual script", () => {
    expect(resolvePhiFontPreloadSubsetKeys("sr", FULL)).toEqual([PhiFontSubsetKey.Latin, PhiFontSubsetKey.Cyrillic]);
    expect(resolvePhiFontPreloadSubsetKeys("sr-Latn-RS", FULL)).toEqual([PhiFontSubsetKey.Latin, PhiFontSubsetKey.LatinExt]);
  });

  it("never names a cut the font does not have", () => {
    expect(resolvePhiFontPreloadSubsetKeys("ru", { subsets: [0, 1], restRanges: [] })).toEqual([PhiFontSubsetKey.Latin]);
  });
});

describe("resolvePhiSiteThemeFonts preloads", () => {
  it("preloads the body font's cuts for the page's language", async () => {
    const fonts = await resolvePhiSiteThemeFonts({ body: "phis:asset/7" }, { ...CONTEXT, locale: "ru" });
    expect(fonts.preloads).toEqual([
      "/api/site/media/7/subsets/0?v=1&r=2",
      "/api/site/media/7/subsets/2?v=1&r=2",
    ]);
  });

  it("preloads nothing for a Site typeface in another slot", async () => {
    const fonts = await resolvePhiSiteThemeFonts({ serif: "phis:asset/7" }, { ...CONTEXT, locale: "de" });
    expect(fonts.css).toContain("unicode-range");
    expect(fonts.preloads).toEqual([]);
  });
});
