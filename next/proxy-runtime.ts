import "server-only";

import type { NextRequest } from "next/server";

import {
  getPhiInternalApiTimeoutMs,
  readPhiSiteRuntimeConfigSync,
} from "../helpers/site-runtime";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";

const HOP_BY_HOP_HEADERS = new Set(["connection", "content-length", "host"]);

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

  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (runtimeConfig.site.key && !headers.has(PHIS_SITE_KEY_HEADER)) {
    headers.set(PHIS_SITE_KEY_HEADER, runtimeConfig.site.key);
  }

  if (runtimeConfig.phis.internalToken && options?.internalToken !== false) {
    headers.set("authorization", `Bearer ${runtimeConfig.phis.internalToken}`);
  } else if (options?.internalToken === false) {
    // Whatever the caller sent under this name is theirs, not a claim about this Site, and Core reads
    // it as one. A hook is unauthenticated by construction and stays that way through here.
    headers.delete("authorization");
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
