import { describe, expect, it } from "vitest";

import { readPhiVisitorPathname } from "./static-render-path";

describe("readPhiVisitorPathname", () => {
  it("drops the static tree's prefix, marker and mode", () => {
    expect(readPhiVisitorPathname("/static-render/7379.514_9f2b/light/de/blog")).toBe("/de/blog");
    expect(readPhiVisitorPathname("/static-render/7379.514_9f2b/dark/de")).toBe("/de");
  });

  it("returns every other path as it is", () => {
    expect(readPhiVisitorPathname("/de/blog")).toBe("/de/blog");
    expect(readPhiVisitorPathname("/builder/phis/ui/dashboard")).toBe("/builder/phis/ui/dashboard");
    expect(readPhiVisitorPathname("/static-renderer/x")).toBe("/static-renderer/x");
  });
});
