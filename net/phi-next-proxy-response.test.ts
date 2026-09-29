import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPhiProxyResponseHeaders, PhiNextProxy } from "./phi-next-proxy";

function upstreamHeaders() {
  const headers = new Headers({
    "content-type": "application/json",
    "content-encoding": "gzip",
    "content-length": "31",
    "transfer-encoding": "chunked",
    connection: "keep-alive",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", "a=1; Path=/");
  headers.append("set-cookie", "b=2; Path=/");
  return headers;
}

/*
 * `fetch` decodes what the Server compressed. A proxy that passes the Server's `content-encoding` on
 * makes the browser decode plain bytes again and fail with ERR_CONTENT_DECODING_FAILED.
 */
describe("the headers a proxy door answers with", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("drops the encoding and length of a body fetch already decoded", () => {
    const headers = buildPhiProxyResponseHeaders(upstreamHeaders(), { bodyDecoded: true });

    expect(headers.get("content-encoding")).toBeNull();
    expect(headers.get("content-length")).toBeNull();
    expect(headers.get("transfer-encoding")).toBeNull();
    expect(headers.get("connection")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("cache-control")).toBe("no-store");
    expect(headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("keeps the encoding of a body passed on as it came", () => {
    const headers = buildPhiProxyResponseHeaders(upstreamHeaders(), { bodyDecoded: false });

    expect(headers.get("content-encoding")).toBe("gzip");
    expect(headers.get("content-length")).toBe("31");
    expect(headers.get("transfer-encoding")).toBeNull();
  });

  it("answers a GET without the upstream encoding", async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { headers: upstreamHeaders() }));
    vi.stubGlobal("fetch", fetchMock);
    const proxy = PhiNextProxy({
      upstreamBaseUrl: "http://core.test",
      upstreamPrefix: "/api/site",
      timeoutMs: 1000,
      logLabel: "test",
      missingBaseUrlMessage: "missing",
      buildHeaders: () => new Headers(),
    });

    const response = await proxy.GET(new NextRequest("https://site.test/api/site/x"), {
      params: Promise.resolve({ path: ["x"] }),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(await response.json()).toEqual({ ok: true });
  });
});
