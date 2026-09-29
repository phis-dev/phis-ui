import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const credentials = vi.hoisted(() => ({ internalToken: "internal-secret", apiBaseUrl: "http://core.test" }));

vi.mock("../helpers/site-runtime", () => ({
  readPhiSiteRuntimeConfigSync: () => ({ site: { key: "skeleton" }, phis: { apiBaseUrl: credentials.apiBaseUrl } }),
  getPhiInternalApiTimeoutMs: () => 8000,
}));
vi.mock("../helpers/phis-server-credentials", () => ({ readPhiServerApiCredentials: () => credentials }));

import { buildPhiNextProxyHeaders } from "./proxy-runtime";

function requestWith(headers: Record<string, string>, url = "https://site.test/api/site/anything") {
  return new NextRequest(url, { headers });
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

/*
 * Core keys rate limits and the address recorded at login on `x-forwarded-for`. The Site sits behind its
 * own reverse proxy (TRUST_PROXY, one by default), so only what that proxy appended is the caller's
 * address; whatever the caller wrote in front of it, or under `x-real-ip`, must not reach Core.
 */
describe("the caller's address and scheme a Site states to Core", () => {
  beforeEach(() => {
    vi.stubEnv("TRUST_PROXY", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forwards the address our proxy appended, not the one the caller wrote", () => {
    const headers = buildPhiNextProxyHeaders(requestWith({
      "x-forwarded-for": "6.6.6.6, 203.0.113.7",
      "x-real-ip": "6.6.6.6",
    }), "test/1.0");

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get("x-real-ip")).toBeNull();
  });

  it("counts as many hops from the right as TRUST_PROXY names", () => {
    vi.stubEnv("TRUST_PROXY", "2");
    const headers = buildPhiNextProxyHeaders(requestWith({
      "x-forwarded-for": "6.6.6.6, 203.0.113.7, 10.0.0.2",
    }), "test/1.0");

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("states no address where no proxy vouches for one", () => {
    vi.stubEnv("TRUST_PROXY", "false");
    const headers = buildPhiNextProxyHeaders(requestWith({
      "x-forwarded-for": "6.6.6.6",
      "x-real-ip": "6.6.6.6",
      forwarded: "for=6.6.6.6",
    }), "test/1.0");

    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(headers.get("x-real-ip")).toBeNull();
    expect(headers.get("forwarded")).toBeNull();
  });

  it("states no address for a chain shorter than the hops it claims", () => {
    vi.stubEnv("TRUST_PROXY", "2");
    const headers = buildPhiNextProxyHeaders(requestWith({ "x-forwarded-for": "6.6.6.6" }), "test/1.0");

    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it("takes the scheme our proxy terminated TLS with", () => {
    const headers = buildPhiNextProxyHeaders(
      requestWith({ "x-forwarded-proto": "https" }, "http://127.0.0.1:52031/api/site/anything"),
      "test/1.0",
    );

    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

  it("takes the value the nearest proxy appended to a scheme list", () => {
    const headers = buildPhiNextProxyHeaders(
      requestWith({ "x-forwarded-proto": "https, http" }),
      "test/1.0",
    );

    expect(headers.get("x-forwarded-proto")).toBe("http");
  });

  it("falls back to the request's own scheme without a trusted proxy", () => {
    vi.stubEnv("TRUST_PROXY", "0");
    const headers = buildPhiNextProxyHeaders(
      requestWith({ "x-forwarded-proto": "https" }, "http://127.0.0.1:52031/api/site/anything"),
      "test/1.0",
    );

    expect(headers.get("x-forwarded-proto")).toBe("http");
  });

  it("drops other forwarding headers the caller sent", () => {
    const headers = buildPhiNextProxyHeaders(requestWith({
      host: "site.test",
      "x-forwarded-host": "evil.test",
      "x-forwarded-port": "1",
    }), "test/1.0");

    expect(headers.get("x-forwarded-host")).toBe("site.test");
    expect(headers.get("x-forwarded-port")).toBeNull();
  });
});
