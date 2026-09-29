import "server-only";

import type { NextRequest } from "next/server";

import {
  getPhiInternalApiTimeoutMs,
  readPhiSiteRuntimeConfigSync,
} from "../helpers/site-runtime";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

const HOP_BY_HOP_HEADERS = new Set(["connection", "content-length", "host"]);

/** Headers Core reads as statements about the Site or the caller's standing. None may come from outside. */
const PHIS_HEADER_PREFIX = "x-phis-";

/**
 * Headers that say where the request came from. The Site states these itself, so whatever a caller sent
 * under these names stops here -- `x-real-ip` and `forwarded` included, which Core would otherwise read
 * where the Site sets no `x-forwarded-for`.
 */
const FORWARDING_HEADER_PREFIX = "x-forwarded-";
const FORWARDING_HEADERS = new Set(["forwarded", "x-real-ip"]);

export function getPhiNextUpstreamBaseUrl() {
  return readPhiSiteRuntimeConfigSync().phis.apiBaseUrl;
}

export function getPhiNextProxyTimeoutMs() {
  return getPhiInternalApiTimeoutMs();
}

/**
 * How many reverse proxies in front of this Site are ours -- the same `TRUST_PROXY` Core reads, with the
 * same convention: unset or `true` is one (the shipped nginx profile, with the runtime bound to
 * `127.0.0.1`), `false` or `0` is none, a number is that many.
 */
function resolvePhiSiteTrustedProxyHops() {
  const raw = process.env.TRUST_PROXY?.trim().toLowerCase() ?? "";
  if (raw === "false" || raw === "0") return 0;
  if (!raw || raw === "true") return 1;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readHeaderList(headers: Headers, name: string) {
  return (headers.get(name) ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * The caller's address as the outermost proxy we run observed it, or null where nothing vouches for one.
 *
 * Route handlers do not see the socket, so the address comes from `X-Forwarded-For`, counted from the
 * right: every proxy appends what it saw, so the first entry is the one a caller writes and the
 * rightmost `n` are our own `n` proxies'. The entry before our own hops is the last one no caller can
 * write past.
 * Core reads the list the same way; the Site hands it a list of exactly that one entry.
 */
export function readPhiSiteClientIp(headers: Headers) {
  const hops = resolvePhiSiteTrustedProxyHops();
  if (hops === 0) return null;
  const forwarded = readHeaderList(headers, "x-forwarded-for");
  // A chain shorter than the hops we claim did not come the way we think; nothing in it is vouched for.
  if (forwarded.length >= hops) return forwarded[forwarded.length - hops] ?? null;
  // Only where the list is absent: a proxy that sets this and no `X-Forwarded-For` overwrites it per
  // request, so it is the caller's only where there is no proxy -- the case ruled out above.
  return forwarded.length === 0 ? headers.get("x-real-ip")?.trim() || null : null;
}

/**
 * The scheme the browser used. Behind our proxy that is what the nearest proxy wrote (nginx sets it with
 * `$scheme`; one that appends puts its own value last); with no proxy it is the request's own, which is
 * what Next derives from the socket.
 */
export function readPhiSiteForwardedProto(request: NextRequest) {
  if (resolvePhiSiteTrustedProxyHops() > 0) {
    const stated = readHeaderList(request.headers, "x-forwarded-proto").at(-1)?.toLowerCase();
    if (stated === "http" || stated === "https") return stated;
  }
  return request.nextUrl.protocol.replace(":", "") || "https";
}

/**
 * What a Site forwards upstream, and what it must not.
 *
 * The Site key comes from the Site's own configuration rather than from the request, which is the whole
 * reason a door on the Site is worth having: a caller from outside cannot state which Site it means, and
 * a webhook sender could not be told to.
 *
 * `internalToken: false` is for a door that faces outward. The internal token says "this came from
 * inside" and travels on every other proxy because every other proxy carries the Site's own work; a
 * request that arrived from the open internet must not pick it up on the way through, or Core loses the
 * one distinction it has between the two.
 */
export function buildPhiNextProxyHeaders(
  request: NextRequest,
  userAgent: string,
  options?: { internalToken?: boolean },
) {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();
  const headers = new Headers();

  /*
   * Nothing a caller sends may speak for this Site. Core reads the Site from `x-phis-site-key` and the
   * caller's standing from the token headers, and one internal token serves every Site of an installation
   * -- so a forwarded `x-phis-site-key` made this Site's door a door to any other Site, carrying the
   * internal token with it. Every `x-phis-*` header and `authorization` are therefore dropped here and
   * only this Site's own values are set below. The forwarding headers likewise: Core keys rate limits
   * and the address recorded at login on them.
   */
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (
      !HOP_BY_HOP_HEADERS.has(name) &&
      !name.startsWith(PHIS_HEADER_PREFIX) &&
      name !== "authorization" &&
      !name.startsWith(FORWARDING_HEADER_PREFIX) &&
      !FORWARDING_HEADERS.has(name)
    ) {
      headers.set(key, value);
    }
  });

  if (!runtimeConfig.site.key) {
    throw new Error("The Site runtime config names no site.key; a proxy cannot say which Site it serves.");
  }
  headers.set(PHIS_SITE_KEY_HEADER, runtimeConfig.site.key);

  // A hook door faces outward and forwards no token: a request from the open internet must not pick up
  // the claim "this came from inside" on the way through.
  if (readPhiServerApiCredentials().internalToken && options?.internalToken !== false) {
    headers.set("authorization", `Bearer ${readPhiServerApiCredentials().internalToken}`);
  }

  headers.set("x-forwarded-host", request.headers.get("host") ?? "localhost");
  headers.set("x-forwarded-proto", readPhiSiteForwardedProto(request));
  // One entry, the address the Site vouches for. None where it vouches for nothing: Core then records no
  // address rather than one a caller chose.
  const clientIp = readPhiSiteClientIp(request.headers);
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
  }

  if (!headers.has("user-agent")) {
    headers.set("user-agent", userAgent);
  }

  return headers;
}
