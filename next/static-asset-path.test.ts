import { describe, expect, it } from "vitest";

import { isPhiAssetOrBackendPath } from "./static-asset-path";

describe("which paths the site proxy lets past as files", () => {
  it("takes a page whose last segment holds a dot for a page", () => {
    expect(isPhiAssetOrBackendPath("/en/team/jane.doe")).toBe(false);
    expect(isPhiAssetOrBackendPath("/en/docs/v1.2")).toBe(false);
  });

  it("lets files, framework and backend paths past", () => {
    expect(isPhiAssetOrBackendPath("/phis_logo_1024w.png")).toBe(true);
    expect(isPhiAssetOrBackendPath("/fonts/Inter.WOFF2")).toBe(true);
    expect(isPhiAssetOrBackendPath("/_next/static/chunk")).toBe(true);
    expect(isPhiAssetOrBackendPath("/api/site/x")).toBe(true);
    expect(isPhiAssetOrBackendPath("/robots.txt")).toBe(true);
  });

  it("does not take an ordinary page for a file", () => {
    expect(isPhiAssetOrBackendPath("/en/about")).toBe(false);
    expect(isPhiAssetOrBackendPath("/apis")).toBe(false);
    expect(isPhiAssetOrBackendPath("/api-docs/intro")).toBe(false);
  });
});
