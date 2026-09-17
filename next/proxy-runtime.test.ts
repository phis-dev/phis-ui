import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const credentials = vi.hoisted(() => ({ internalToken: "internal-secret", apiBaseUrl: "http://core.test" }));

vi.mock("../helpers/site-runtime", () => ({
  readPhiSiteRuntimeConfigSync: () => ({ site: { key: "skeleton" }, phis: { apiBaseUrl: credentials.apiBaseUrl } }),
  getPhiInternalApiTimeoutMs: () => 8000,
}));
vi.mock("../helpers/phis-server-credentials", () => ({ readPhiServerApiCredentials: () => credentials }));

import { buildPhiNextProxyHeaders } from "./proxy-runtime";

function requestWith(headers: Record<string, string>) {
  return new NextRequest("https://site.test/api/site/anything", { headers });
}

/*
 * A Site's proxy speaks for that Site and nobody else. Core resolves the Site from `x-phis-site-key` and
 * trusts the internal token for every Site of the installation, so anything a caller sends under those
 * names must not survive the proxy.
 */
describe("the headers a Site forwards to Core", () => {
  beforeEach(() => {
    credentials.internalToken = "internal-secret";
  });

  it("names this Site even when the caller names another", () => {
    const headers = buildPhiNextProxyHeaders(requestWith({ "x-phis-site-key": "other-site" }), "test/1.0");

    expect(headers.get("x-phis-site-key")).toBe("skeleton");
  });

  it("drops every x-phis header and token the caller sent", () => {
    const headers = buildPhiNextProxyHeaders(requestWith({
      "x-phis-token": "guess",
      "x-phis-area": "admin",
      "x-phis-request-path": "/admin",
      authorization: "Bearer guess",
      cookie: "phis_session=abc",
      accept: "application/json",
    }), "test/1.0");

    expect(headers.get("x-phis-token")).toBeNull();
    expect(headers.get("x-phis-area")).toBeNull();
    expect(headers.get("x-phis-request-path")).toBeNull();
    expect(headers.get("authorization")).toBe("Bearer internal-secret");
    expect(headers.get("cookie")).toBe("phis_session=abc");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("forwards no token at all on an outward door", () => {
    const headers = buildPhiNextProxyHeaders(requestWith({ authorization: "Bearer guess" }), "test/1.0", {
      internalToken: false,
    });

    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-phis-site-key")).toBe("skeleton");
  });
});
