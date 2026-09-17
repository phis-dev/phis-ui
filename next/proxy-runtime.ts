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

export function getPhiNextUpstreamBaseUrl() {
  return readPhiSiteRuntimeConfigSync().phis.apiBaseUrl;
}

export function getPhiNextProxyTimeoutMs() {
  return getPhiInternalApiTimeoutMs();
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
   * only this Site's own values are set below.
   */
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(name) && !name.startsWith(PHIS_HEADER_PREFIX) && name !== "authorization") {
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
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", "") || "https");
  headers.set(
    "x-forwarded-for",
    request.headers.get("x-forwarded-for")?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "127.0.0.1",
  );

  if (!headers.has("user-agent")) {
    headers.set("user-agent", userAgent);
  }

  return headers;
}
