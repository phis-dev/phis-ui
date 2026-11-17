import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const site = vi.hoisted(() => ({ theme: {} as Record<string, unknown> }));
vi.mock("./site-config", () => ({ getResolvedSiteConfig: async () => ({ theme: site.theme }) }));

import { buildPhiSignetVersion, decodePhiSignetDataUrl } from "../helpers/phi-signet";
import { buildPhiSignetRouteHandler } from "./signet-route";

function pngOf(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 0);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}
const png = (size: number) => `data:image/png;base64,${Buffer.from(pngOf(size, size)).toString("base64")}`;
const svg = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg'/>")}`;

const upstream = vi.hoisted(() => ({ response: null as (() => Response) | null, asked: [] as string[] }));
const proxied = async (request: NextRequest) => {
  upstream.asked.push(new URL(request.url).pathname);
  return upstream.response?.() ?? new Response(null, { status: 404 });
};

function handler(brandSignet: unknown) {
  site.theme = brandSignet ? { brand: { signet: brandSignet } } : {};
  return buildPhiSignetRouteHandler({
    loadAreaBridge: async () => ({ runtime: { apiBaseUrl: "http://core", internalToken: "t", siteKey: "s" } }) as never,
    proxied: proxied as never,
  });
}
const dataSignet = (source: string) => ({ sourceKind: "url", sourceUrl: source });
const ask = (get: ReturnType<typeof handler>, query = "") =>
  get(new NextRequest(`http://site.test/api/site/signet${query}`));

describe("the Signet route", () => {
  beforeEach(() => {
    upstream.response = null;
    upstream.asked = [];
  });

  it("delivers a data URL Signet with its own type and a year of cache at its identified address", async () => {
    const version = buildPhiSignetVersion(pngOf(512, 512));
    const response = await ask(handler(dataSignet(png(512))), `?v=${version}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pngOf(512, 512));
  });

  it("answers an identifier that is not current with the current picture, briefly cached", async () => {
    const response = await ask(handler(dataSignet(png(512))), "?v=0000000000");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("answers /favicon.ico's address with the same picture on a short cache", async () => {
    const response = await ask(handler(dataSignet(png(64))), "?as=favicon");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("answers the Apple addresses for a PNG of 180 px or more, and 404 below it and for an SVG", async () => {
    expect((await ask(handler(dataSignet(png(512))), "?as=apple")).status).toBe(200);
    expect((await ask(handler(dataSignet(png(64))), "?as=apple")).status).toBe(404);
    expect((await ask(handler(dataSignet(svg)), "?as=apple")).status).toBe(404);
    expect((await ask(handler(dataSignet(svg)), "?as=favicon")).headers.get("content-type")).toBe("image/svg+xml");
  });

  it("keeps a script in an SVG from running on the Site's origin", async () => {
    const response = await ask(handler(dataSignet(svg)));
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("answers 404 for an address on another server, which is neither fetched nor redirected to", async () => {
    const response = await ask(handler({ sourceKind: "url", sourceUrl: "https://example.com/s.png" }));
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
    expect(upstream.asked).toEqual([]);
  });

  it("answers 404 for a Site without a Signet and for one that cannot be delivered", async () => {
    expect((await ask(handler(null))).status).toBe(404);
    expect((await ask(handler(dataSignet("data:text/html;base64,PHA+")))).status).toBe(404);
    expect(decodePhiSignetDataUrl("data:text/html;base64,PHA+")).toBeNull();
  });

  it("delivers a library Signet through the Asset's own address, on a short cache", async () => {
    const get = handler({ sourceKind: "asset", assetId: 12 });
    upstream.response = () => new Response(pngOf(256, 256), { headers: { "content-type": "image/png" } });
    const response = await ask(get, `?v=${buildPhiSignetVersion("asset:12")}`);
    expect(upstream.asked).toEqual(["/api/site/media/12/content"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect((await ask(get, "?as=apple")).status).toBe(200);
  });

  it("answers 404 where the Asset is not an image", async () => {
    const get = handler({ sourceKind: "asset", assetId: 12 });
    upstream.response = () => new Response("x", { headers: { "content-type": "text/html" } });
    expect((await ask(get)).status).toBe(404);
  });

  it("caches a library Signet that carries its revision for a year at the address with that identifier", async () => {
    const get = handler({ sourceKind: "asset", assetId: 12, url: "/api/site/media/12/content?r=5", contentType: "image/png", width: 256, height: 256 });
    upstream.response = () => new Response(pngOf(256, 256), { headers: { "content-type": "image/png" } });
    const response = await ask(get, `?v=${buildPhiSignetVersion("asset:12:r5")}`);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    // The address of the picture before it was replaced is not the current one: the new picture, briefly.
    const replaced = await ask(get, `?v=${buildPhiSignetVersion("asset:12:r4")}`);
    expect(replaced.status).toBe(200);
    expect(replaced.headers.get("cache-control")).toBe("public, max-age=3600");
    // The id-only identifier no longer matches once a revision is known.
    expect((await ask(get, `?v=${buildPhiSignetVersion("asset:12")}`)).headers.get("cache-control")).toBe("public, max-age=3600");
  });
});
