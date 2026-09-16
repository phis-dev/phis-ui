import { describe, expect, it } from "vitest";
import type { PhiFontMetrics } from "@phis/contracts/media";

import {
  buildPhiFontFaceCss,
  buildPhiFontFamilyStack,
} from "./phi-font-face";

/**
 * The rules a Site-owned typeface renders with.
 *
 * The numbers are Fira Sans as this installation's own build reports it, so the expectations below are
 * what `next/font` writes for the same face -- the point of the exercise is that a font from the Media
 * library stands in as well as one from the build.
 */
const FIRA_SANS: PhiFontMetrics = {
  format: "woff2",
  familyName: "Fira Sans",
  unitsPerEm: 1000,
  ascent: 935,
  descent: -265,
  lineGap: 0,
  capHeight: 689,
  xHeight: 527,
  xWidthAvg: 460,
  xWidthAvgSource: "glyphs",
  category: "sans-serif",
};

const source = (overrides: Partial<Parameters<typeof buildPhiFontFaceCss>[0]> = {}) => ({
  family: "Fira Sans",
  url: "/api/site/media/42/content",
  contentType: "font/woff2",
  metrics: FIRA_SANS,
  ...overrides,
});

describe("Site-owned font faces", () => {
  it("declares the face and a substitute proportioned to stand in for it", () => {
    const css = buildPhiFontFaceCss(source());
    expect(css).toContain('@font-face{font-family:"Fira Sans";src:url("/api/site/media/42/content") format("woff2");font-display:swap}');
    expect(css).toContain('font-family:"Fira Sans Fallback"');
    expect(css).toContain('src:local("Arial")');
    // 460/1000 against Arial's 913/2048, and the extents divided by that same adjustment.
    expect(css).toContain("size-adjust:103.19%");
    expect(css).toContain("ascent-override:90.61%");
    expect(css).toContain("descent-override:25.68%");
    expect(css).toContain("line-gap-override:0.00%");
  });

  it("stands a serif in with a serif and a monospace with a monospace", () => {
    expect(buildPhiFontFaceCss(source({ metrics: { ...FIRA_SANS, category: "serif" } })))
      .toContain('src:local("Times New Roman")');
    expect(buildPhiFontFaceCss(source({ metrics: { ...FIRA_SANS, category: "monospace" } })))
      .toContain('src:local("Courier New")');
    // A file that classifies itself as nothing takes the slot's own answer.
    expect(buildPhiFontFaceCss(source({
      metrics: { ...FIRA_SANS, category: null },
      fallbackCategory: "serif",
    }))).toContain('src:local("Times New Roman")');
  });

  it("adjusts only the extents when the width could not be measured", () => {
    const css = buildPhiFontFaceCss(source({ metrics: { ...FIRA_SANS, xWidthAvg: null, xWidthAvgSource: null } }));
    expect(css).toContain("size-adjust:100.00%");
    expect(css).toContain("ascent-override:93.50%");
  });

  it("writes the face alone when the font says nothing about itself", () => {
    const css = buildPhiFontFaceCss(source({ metrics: null }));
    expect(css).toContain('font-family:"Fira Sans"');
    expect(css).not.toContain("Fallback");
    expect(buildPhiFontFamilyStack(source({ metrics: null }))).toBe('"Fira Sans", sans-serif');
  });

  it("refuses what it cannot name a format for", () => {
    expect(buildPhiFontFaceCss(source({ contentType: "application/octet-stream" }))).toBeNull();
    expect(buildPhiFontFaceCss(source({ url: "" }))).toBeNull();
  });

  /*
   * A family name comes out of a file somebody uploaded and both values end up inside a stylesheet.
   * What must hold is not that the text looks harmless but that it cannot become syntax: no quote to
   * close a string with, no brace to end a rule with, and therefore no third rule.
   */
  it("keeps a family name and a URL from leaving the rule they were written for", () => {
    const css = buildPhiFontFaceCss(source({
      family: 'Evil";}body{display:none}@font-face{font-family:"x',
      url: '/api/site/media/42/content");}body{display:none}@font-face{src:url("x',
    }))!;
    expect(css.match(/@font-face/gu)).toHaveLength(2);
    expect(css.match(/\{/gu)).toHaveLength(2);
    expect(css.match(/\}/gu)).toHaveLength(2);
    // Every quote in the output is one this module wrote: family, URL and format in the face, family
    // and the local name in the substitute.
    expect(css.match(/"/gu)).toHaveLength(10);
    expect(css).toMatch(/font-family:"[\w \-.]+";src:url\("[\w\-./?&=:%~+]+"\)/u);
  });

  it("puts the adjusted substitute between the face and the generic", () => {
    expect(buildPhiFontFamilyStack(source())).toBe('"Fira Sans", "Fira Sans Fallback", sans-serif');
  });
});
