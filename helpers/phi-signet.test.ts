import { describe, expect, it } from "vitest";

import { buildPhiRootMetadata } from "./phi-metadata";
import { buildPhiSignetVersion, decodePhiSignetDataUrl, readPhiPngSize } from "./phi-signet";
import { describePhiSignetHead } from "./phi-signet-head";
import { PHI_SIGNET_PATH } from "./phi-signet-paths";
import { readPhiThemeSiteSignet } from "../theme/phi-theme-signet";

/** A PNG header of the stated size: signature, IHDR, and nothing after it that a reader of the size needs. */
function pngOf(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  new DataView(bytes.buffer).setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}
const pngUrl = (width: number, height: number) =>
  `data:image/png;base64,${Buffer.from(pngOf(width, height)).toString("base64")}`;
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>';

describe("decoding a Signet data URL", () => {
  it("decodes a base64 picture of each allowed type", () => {
    for (const type of ["image/png", "image/svg+xml", "image/x-icon", "image/webp"]) {
      const image = decodePhiSignetDataUrl(`data:${type};base64,${Buffer.from("abc").toString("base64")}`);
      expect(image?.contentType).toBe(type);
      expect(Array.from(image?.bytes ?? [])).toEqual([97, 98, 99]);
    }
  });

  it("decodes an SVG written as text, percent-encoded or not", () => {
    expect(new TextDecoder().decode(decodePhiSignetDataUrl(`data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`)?.bytes))
      .toBe(SVG);
    expect(new TextDecoder().decode(decodePhiSignetDataUrl(`data:image/svg+xml,${encodeURIComponent(SVG)}`)?.bytes))
      .toBe(SVG);
    expect(decodePhiSignetDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG)}`)).not.toBeNull();
  });

  it.each([
    ["another media type", `data:image/gif;base64,${Buffer.from("abc").toString("base64")}`],
    ["a document", `data:text/html;base64,${Buffer.from("<p>").toString("base64")}`],
    ["a raster written as text", "data:image/png,abc"],
    ["broken base64", "data:image/png;base64,@@@@"],
    ["an empty payload", "data:image/png;base64,"],
    ["a broken percent escape", "data:image/svg+xml;utf8,%E0%A4%A"],
    ["an address", "https://example.com/signet.png"],
    ["a path", "/signet.png"],
    ["an empty string", ""],
  ])("refuses %s", (_label, source) => {
    expect(decodePhiSignetDataUrl(source)).toBeNull();
  });
});

describe("reading a PNG's size", () => {
  it("reads the header", () => {
    expect(readPhiPngSize(pngOf(512, 256))).toEqual({ width: 512, height: 256 });
  });

  it("answers null for what is not a PNG with a header", () => {
    expect(readPhiPngSize(new TextEncoder().encode(SVG))).toBeNull();
    expect(readPhiPngSize(pngOf(0, 10))).toBeNull();
    expect(readPhiPngSize(pngOf(10, 10).slice(0, 20))).toBeNull();
    const notIhdr = pngOf(10, 10);
    notIhdr[12] = 0x58;
    expect(readPhiPngSize(notIhdr)).toBeNull();
  });
});

describe("the identifier in the Signet's address", () => {
  it("follows the picture and nothing else", () => {
    const a = buildPhiSignetVersion(pngOf(64, 64));
    expect(a).toMatch(/^[0-9a-f]{10}$/u);
    expect(buildPhiSignetVersion(pngOf(64, 64))).toBe(a);
    expect(buildPhiSignetVersion(pngOf(64, 65))).not.toBe(a);
  });

  it("is in the address the head names", () => {
    const head = describePhiSignetHead({ kind: "data", source: pngUrl(64, 64), from: "site" });
    expect(head?.href).toBe(`${PHI_SIGNET_PATH}?v=${buildPhiSignetVersion(pngOf(64, 64))}`);
    expect(describePhiSignetHead({ kind: "data", source: pngUrl(65, 64), from: "site" })?.href).not.toBe(head?.href);
  });
});

describe("what the head says about a Signet", () => {
  it("names a PNG of 180 px or more as icon and Apple touch icon", () => {
    const head = describePhiSignetHead({ kind: "data", source: pngUrl(512, 512), from: "site" });
    expect(head).toMatchObject({ type: "image/png", sizes: "512x512" });
    expect(head?.apple).toEqual({ href: head?.href, type: "image/png", sizes: "512x512" });
  });

  it("leaves the Apple touch icon out below 180 px", () => {
    const head = describePhiSignetHead({ kind: "data", source: pngUrl(179, 512), from: "site" });
    expect(head).toMatchObject({ type: "image/png", sizes: "179x512" });
    expect(head?.apple).toBeUndefined();
  });

  it("names an SVG without a size and without an Apple touch icon", () => {
    const head = describePhiSignetHead({ kind: "data", source: `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`, from: "site" });
    expect(head?.type).toBe("image/svg+xml");
    expect(head?.sizes).toBeUndefined();
    expect(head?.apple).toBeUndefined();
  });

  it("names a library picture by its address alone", () => {
    const head = describePhiSignetHead({ kind: "asset", assetId: 7, from: "site" });
    expect(head?.href).toBe(`${PHI_SIGNET_PATH}?v=${buildPhiSignetVersion("asset:7")}`);
    expect(head?.type).toBeUndefined();
    expect(head?.apple).toBeUndefined();
  });

  it("names a Set's Signet, which the Site only follows, as the data URL it is", () => {
    const source = pngUrl(512, 512);
    const head = describePhiSignetHead({ kind: "data", source, from: "set" });
    expect(head).toEqual({ href: source });
    expect(buildPhiRootMetadata({ signet: head }).icons).toEqual({ icon: { url: source } });
  });

  it("says nothing for no Signet and for one that cannot be delivered", () => {
    expect(describePhiSignetHead(null)).toBeNull();
    expect(describePhiSignetHead({ kind: "data", source: "data:text/html;base64,PHA+", from: "site" })).toBeNull();
  });
});

describe("the root metadata", () => {
  it("carries icon and apple for a Signet that is a large PNG", () => {
    const head = describePhiSignetHead({ kind: "data", source: pngUrl(512, 512), from: "site" });
    const metadata = buildPhiRootMetadata({ signet: head });
    expect(metadata.icons).toEqual({
      icon: { url: head?.href, type: "image/png", sizes: "512x512" },
      apple: { url: head?.href, type: "image/png", sizes: "512x512" },
    });
  });

  it("carries icon alone for an SVG", () => {
    const head = describePhiSignetHead({ kind: "data", source: `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`, from: "site" });
    expect(buildPhiRootMetadata({ signet: head }).icons).toEqual({ icon: { url: head?.href, type: "image/svg+xml" } });
  });

  it("carries no icons without a Signet", () => {
    expect(buildPhiRootMetadata({}).icons).toBeUndefined();
    expect(buildPhiRootMetadata({ signet: null }).icons).toBeUndefined();
  });
});

function siteHead(authored: Parameters<typeof readPhiThemeSiteSignet>[0]) {
  const picture = readPhiThemeSiteSignet(authored);
  if (!picture) throw new Error("not a deliverable Signet");
  return describePhiSignetHead({ ...picture, from: "site" });
}

describe("a library Signet as the Core 0.4.1 resolves it", () => {
  const resolved = (extra: Record<string, unknown> = {}) => ({
    sourceKind: "asset" as const,
    assetId: 7,
    url: "/api/site/media/7/content?r=3",
    contentType: "image/png",
    width: 512,
    height: 512,
    ...extra,
  });

  it("reads the revision from the delivered address, and the type and size beside it", () => {
    expect(readPhiThemeSiteSignet(resolved())).toEqual({
      kind: "asset", assetId: 7, revision: 3, contentType: "image/png", width: 512, height: 512,
    });
  });

  it("reads only what it can trust: the address of this Asset, an image type, a whole size", () => {
    expect(readPhiThemeSiteSignet(resolved({ url: "/api/site/media/8/content?r=3" }))).not.toHaveProperty("revision");
    expect(readPhiThemeSiteSignet(resolved({ url: "https://example.com/api/site/media/7/content?r=3" }))).not.toHaveProperty("revision");
    expect(readPhiThemeSiteSignet(resolved({ url: "/api/site/media/7/content?r=x" }))).not.toHaveProperty("revision");
    expect(readPhiThemeSiteSignet(resolved({ url: "/api/site/media/7/content" }))).not.toHaveProperty("revision");
    expect(readPhiThemeSiteSignet(resolved({ contentType: "text/html" }))).not.toHaveProperty("contentType");
    expect(readPhiThemeSiteSignet(resolved({ width: 512, height: null }))).not.toHaveProperty("width");
  });

  it("names the address by the revision, so a replaced picture is a new address", () => {
    const first = siteHead(resolved());
    const replaced = siteHead(resolved({ url: "/api/site/media/7/content?r=4" }));
    expect(first?.href).toBe(`${PHI_SIGNET_PATH}?v=${buildPhiSignetVersion("asset:7:r3")}`);
    expect(replaced?.href).not.toBe(first?.href);
  });

  it("states type and size, and an Apple touch icon for a PNG of 180 px or more", () => {
    const head = siteHead(resolved());
    expect(head).toMatchObject({ type: "image/png", sizes: "512x512" });
    expect(head?.apple).toEqual({ href: head?.href, type: "image/png", sizes: "512x512" });
  });

  it("leaves the Apple touch icon out below 180 px and for another type", () => {
    const small = siteHead(resolved({ width: 64, height: 64 }));
    expect(small).toMatchObject({ type: "image/png", sizes: "64x64" });
    expect(small?.apple).toBeUndefined();
    const svg = siteHead(resolved({ contentType: "image/svg+xml" }));
    expect(svg?.type).toBe("image/svg+xml");
    expect(svg?.apple).toBeUndefined();
  });

  it("is named as before where the Core states none of it", () => {
    const head = siteHead({ sourceKind: "asset", assetId: 7 });
    expect(head).toEqual({ href: `${PHI_SIGNET_PATH}?v=${buildPhiSignetVersion("asset:7")}` });
  });
});
