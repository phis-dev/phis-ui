import { describe, expect, it } from "vitest";

import { resolvePhiWidgetSourceUrl } from "./widget-source-url";

describe("resolvePhiWidgetSourceUrl", () => {
  it("resolves a path against the Site's public URL", () => {
    expect(resolvePhiWidgetSourceUrl(" /docs/guide.md ", "https://phis.dev")).toBe("https://phis.dev/docs/guide.md");
    expect(resolvePhiWidgetSourceUrl("/docs/guide.md?raw=1", "https://phis.dev/")).toBe(
      "https://phis.dev/docs/guide.md?raw=1",
    );
  });

  it("returns an absolute or protocol-relative address as written", () => {
    expect(resolvePhiWidgetSourceUrl("https://example.com/a.md", null)).toBe("https://example.com/a.md");
    expect(resolvePhiWidgetSourceUrl("//example.com/a.md", null)).toBe("//example.com/a.md");
  });

  it("refuses a path when the Site has no public URL", () => {
    expect(() => resolvePhiWidgetSourceUrl("/docs/guide.md", " ")).toThrow(/public URL/u);
  });
});
