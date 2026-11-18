import { describe, expect, it } from "vitest";

import { buildPhiThemeLinkTokens, isPhiMarkableExternalHref, readPhiThemeExternalLinkMark } from "./phi-link-mark";

describe("the external link mark", () => {
  it("is shown unless the Theme says false", () => {
    expect(readPhiThemeExternalLinkMark(null)).toBe(true);
    expect(readPhiThemeExternalLinkMark({})).toBe(true);
    expect(readPhiThemeExternalLinkMark({ externalMark: true })).toBe(true);
    expect(readPhiThemeExternalLinkMark({ externalMark: false })).toBe(false);
  });

  it("rides as the display the stylesheet reads", () => {
    expect(buildPhiThemeLinkTokens(undefined)).toEqual({ linkExternalMark: "inline-block" });
    expect(buildPhiThemeLinkTokens({ externalMark: false })).toEqual({ linkExternalMark: "none" });
  });

  it("marks a link over the web and nothing else", () => {
    expect(isPhiMarkableExternalHref("https://www.edoeb.admin.ch")).toBe(true);
    expect(isPhiMarkableExternalHref("//cdn.example.com/x")).toBe(true);
    expect(isPhiMarkableExternalHref("mailto:info@example.com")).toBe(false);
    expect(isPhiMarkableExternalHref("tel:+41000000")).toBe(false);
    expect(isPhiMarkableExternalHref("/en/imprint")).toBe(false);
  });
});
