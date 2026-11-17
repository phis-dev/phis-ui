import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../helpers/site-runtime", () => ({
  readPhiSiteRuntimeConfigSync: () => ({ site: { key: "skeleton" }, phis: { apiBaseUrl: "http://core.test" } }),
}));
vi.mock("../server-helpers/site-locale", () => ({
  fetchResolvedSiteLocale: vi.fn(),
  fetchSiteLocaleConfig: vi.fn(),
}));
vi.mock("../gateway/area-root-door", () => ({ peekPhiAreaRootDoor: vi.fn() }));
vi.mock("../gateway/site-config", () => ({ getResolvedSiteConfig: vi.fn() }));
vi.mock("../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "http://core.test", internalToken: "t" }),
}));

import { proxyPhiNextSiteRequest } from "./site-proxy";

/*
 * Behind nginx the request URL is `https://localhost:<port>` -- the scheme the browser used, the address the
 * service listens on. The service speaks HTTP only, so a rewrite that kept `https` failed with EPROTO.
 */
describe("the Signet aliases the browser asks for unprompted", () => {
  it.each([
    ["/favicon.ico", "favicon"],
    ["/apple-touch-icon.png", "apple"],
    ["/apple-touch-icon-precomposed.png", "apple"],
  ])("rewrites %s to the Site's Signet door over plain HTTP", async (path, alias) => {
    const response = await proxyPhiNextSiteRequest(new NextRequest(`https://localhost:53001${path}`));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `http://localhost:53001/api/site/signet?as=${alias}`,
    );
  });
});
