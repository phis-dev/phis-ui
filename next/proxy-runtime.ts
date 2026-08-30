import "server-only";

import type { NextRequest } from "next/server";

import {
  getPhiInternalApiTimeoutMs,
  readPhiSiteRuntimeConfigSync,
} from "../helpers/site-runtime";

const HOP_BY_HOP_HEADERS = new Set(["connection", "content-length", "host"]);

export function getPhiNextUpstreamBaseUrl() {
  return readPhiSiteRuntimeConfigSync().phis.apiBaseUrl;
}

export function getPhiNextProxyTimeoutMs() {
  return getPhiInternalApiTimeoutMs();
}

export function buildPhiNextProxyHeaders(request: NextRequest, userAgent: string) {
  const runtimeConfig = readPhiSiteRuntimeConfigSync();
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (runtimeConfig.site.key && !headers.has("x-phi-site-key")) {
    headers.set("x-phi-site-key", runtimeConfig.site.key);
  }

  if (runtimeConfig.phis.internalToken) {
    headers.set("authorization", `Bearer ${runtimeConfig.phis.internalToken}`);
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
