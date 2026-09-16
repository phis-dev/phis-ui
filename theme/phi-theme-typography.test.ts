import { describe, expect, it } from "vitest";

import { readPhiThemeHeadingFont, resolvePhiThemeHeadingFontFamily } from "./phi-theme-typography";

const stacks = {
  serif: "var(--phi-font-source-serif)",
  display: '"Marcellus", "Marcellus Fallback", serif',
};

/**
 * Which family a page's headings wear.
 *
 * The point of the "nothing" answers is that a Theme which never chose, or chose body, sets no variable
 * at all -- the heading then inherits, and every existing page renders exactly as before.
 */
describe("Theme heading font", () => {
  it("leaves headings on the body font unless a Theme says otherwise", () => {
    expect(resolvePhiThemeHeadingFontFamily(undefined, stacks)).toBeUndefined();
    expect(resolvePhiThemeHeadingFontFamily({ headings: "body" }, stacks)).toBeUndefined();
  });

  it("sets headings in the serif or display slot the Theme names", () => {
    expect(resolvePhiThemeHeadingFontFamily({ headings: "serif" }, stacks)).toBe(stacks.serif);
    expect(resolvePhiThemeHeadingFontFamily({ headings: "display" }, stacks)).toBe(stacks.display);
  });

  // Display without a family is the body font -- not the serif, which is what the widgets' helper used to say.
  it("falls back to the body font when the named slot holds no family", () => {
    expect(resolvePhiThemeHeadingFontFamily({ headings: "display" }, { serif: stacks.serif, display: "" })).toBeUndefined();
    expect(resolvePhiThemeHeadingFontFamily({ headings: "serif" }, { display: stacks.display })).toBeUndefined();
  });

  it("reads anything it does not know as body", () => {
    expect(readPhiThemeHeadingFont({ headings: "handwriting" as never })).toBe("body");
    expect(readPhiThemeHeadingFont(null)).toBe("body");
  });
});
