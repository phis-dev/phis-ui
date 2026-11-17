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
    const headers = buildPhiProxyResponseHeaders(upstreamHeaders());

    expect(headers.get("content-encoding")).toBeNull();
    expect(headers.get("content-length")).toBeNull();
    expect(headers.get("transfer-encoding")).toBeNull();
    expect(headers.get("connection")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("cache-control")).toBe("no-store");
    expect(headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
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

  it("answers a POST through fetch as well, with the body streamed on and the encoding dropped", async () => {
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) =>
      new Response('{"ok":true}', { status: 201, headers: upstreamHeaders() }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const proxy = PhiNextProxy({
      upstreamBaseUrl: "http://core.test",
      upstreamPrefix: "/api/v1/addons",
      timeoutMs: 1000,
      logLabel: "test",
      missingBaseUrlMessage: "missing",
      buildHeaders: () => new Headers(),
    });

    const response = await proxy.POST(
      new NextRequest("https://site.test/api/addons/x", { method: "POST", body: '{"a":1}' }),
      { params: Promise.resolve({ path: ["x"] }) },
    );

    const init = fetchMock.mock.calls[0]?.[1] as (RequestInit & { duplex?: string }) | undefined;
    expect(init?.method).toBe("POST");
    expect(init?.duplex).toBe("half");
    expect(init?.body).toBeTruthy();
    expect(response.status).toBe(201);
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("keeps what describes the bytes themselves: range, validators, vary", () => {
    const upstream = new Headers({
      "content-type": "image/png",
      "content-range": "bytes 0-99/1000",
      "accept-ranges": "bytes",
      etag: '"abc"',
      vary: "Accept-Encoding",
    });
    const headers = buildPhiProxyResponseHeaders(upstream);

    expect(headers.get("content-range")).toBe("bytes 0-99/1000");
    expect(headers.get("accept-ranges")).toBe("bytes");
    expect(headers.get("etag")).toBe('"abc"');
    expect(headers.get("vary")).toBe("Accept-Encoding");
  });
});
