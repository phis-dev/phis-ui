import "server-only";

import { NextRequest } from "next/server";

import { readPhiThemeSiteSignet } from "../theme/phi-theme-signet";
import { PHI_SIGNET_ALIAS_PARAM, PHI_SIGNET_APPLE_MIN_SIZE, PHI_SIGNET_VERSION_PARAM } from "../helpers/phi-signet-paths";
import {
  buildPhiSignetVersion,
  decodePhiSignetDataUrl,
  readPhiPngSize,
  type PhiSignetImage,
} from "../helpers/phi-signet";
import { getResolvedSiteConfig } from "./site-config";
import type { PhiNextProxyHandler } from "../net/phi-next-proxy";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";

/** An address that names the picture's own content never changes what it answers: a year, immutable. */
const PHI_SIGNET_CACHE_IDENTIFIED = "public, max-age=31536000, immutable";
/**
 * Everything else: the browser's own `/favicon.ico` and Apple paths, an address whose identifier is not
 * the current one, and a library picture, whose identifier cannot see the bytes. Short, so a changed
 * Signet reaches the tab within the hour.
 */
const PHI_SIGNET_CACHE_SHORT = "public, max-age=3600";
const PHI_SIGNET_CACHE_MISSING = "public, max-age=300";

/**
 * The picture is only ever shown by an `<img>` or the tab, but its address can be opened as a document,
 * and an SVG is a document. The sandbox and the empty policy keep a script in one from running on the
 * Site's origin.
 */
const PHI_SIGNET_SECURITY_HEADERS = {
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "x-content-type-options": "nosniff",
};

function missing() {
  return new Response(null, { status: 404, headers: { "cache-control": PHI_SIGNET_CACHE_MISSING } });
}

/**
 * A library picture, read through the same door every Asset is delivered by.
 *
 * Not redirected: the Apple path has to know whether the bytes are a PNG of 180 px, and the tab should
 * not depend on a second request that follows a first. Anything that is not an image answers null.
 */
async function readPhiSignetAsset(
  assetId: number,
  request: NextRequest,
  proxied: PhiNextProxyHandler,
): Promise<PhiSignetImage | null> {
  const upstream = await proxied(
    new NextRequest(new URL(`/api/site/media/${assetId}/content`, request.url), { headers: request.headers }),
    { params: Promise.resolve({ path: ["media", String(assetId), "content"] }) },
  );
  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!upstream.ok || !contentType.startsWith("image/")) return null;
  return { contentType, bytes: new Uint8Array(await upstream.arrayBuffer()) };
}

/**
 * `GET /api/site/signet`: the Signet the Site owns, as a picture at a real address.
 *
 * Only the Site's own, `theme.brand.signet` of the published record, which a Theme save writes
 * (`materializePhiThemeBrandSignet`). A Theme Set's Signet is not resolved here: that needs the Theme
 * blocks of the installed Modules, a graph this door does not carry, and the head names a followed Set's
 * Signet as the data URL it is instead. An Asset is read through the media door; an inline `data:image/`
 * picture is decoded. An address on another server is answered 404 and not redirected: a redirect from
 * the favicon path would send every visitor's request to a third party, the head cannot name it, and
 * nothing writes one -- the save uploads what it finds.
 *
 * Three ways in, one picture. The head names `?v=<identifier>`; the proxy rewrites the browser's own
 * `/favicon.ico`, `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` to `?as=favicon|apple`.
 * An Apple path answers only for a PNG of 180 px or more -- anything else would be scaled into a blur.
 * No Site Signet, or one that cannot be delivered, answers 404.
 */
export function buildPhiSignetRouteHandler({
  loadAreaBridge,
  proxied,
}: {
  loadAreaBridge: PhiSiteAreaBridgeLoader;
  proxied: PhiNextProxyHandler;
}) {
  return async function GET(request: NextRequest) {
    // Any Bridge knows the Site's key and its Core; the Public one is the one every Site has.
    const runtime = (await loadAreaBridge("public"))?.runtime;
    if (!runtime) return missing();
    const site = await getResolvedSiteConfig({
      apiBaseUrl: runtime.apiBaseUrl,
      internalToken: runtime.internalToken,
      siteKey: runtime.siteKey,
    });
    const signet = readPhiThemeSiteSignet(site.theme?.brand?.signet);
    if (!signet) return missing();

    let image: PhiSignetImage | null;
    let identity: Uint8Array | string;
    if (signet.kind === "data") {
      image = decodePhiSignetDataUrl(signet.source);
      identity = image?.bytes ?? "";
    } else {
      image = await readPhiSignetAsset(signet.assetId, request, proxied);
      identity = `asset:${signet.assetId}`;
    }
    if (!image) return missing();

    const alias = request.nextUrl.searchParams.get(PHI_SIGNET_ALIAS_PARAM);
    if (alias === "apple") {
      const size = image.contentType === "image/png" ? readPhiPngSize(image.bytes) : null;
      if (!size || size.width < PHI_SIGNET_APPLE_MIN_SIZE || size.height < PHI_SIGNET_APPLE_MIN_SIZE) {
        return missing();
      }
    }

    const asked = request.nextUrl.searchParams.get(PHI_SIGNET_VERSION_PARAM);
    const identified = alias === null && asked === buildPhiSignetVersion(identity);
    return new Response(Buffer.from(image.bytes), {
      status: 200,
      headers: {
        "content-type": image.contentType,
        "content-length": String(image.bytes.length),
        "cache-control": identified && signet.kind === "data" ? PHI_SIGNET_CACHE_IDENTIFIED : PHI_SIGNET_CACHE_SHORT,
        ...PHI_SIGNET_SECURITY_HEADERS,
      },
    });
  };
}
