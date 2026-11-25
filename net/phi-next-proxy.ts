import "server-only";

import type { NextRequest } from "next/server";
import { logRuntimeEvent } from "./log";

type PhiProxyPath = string[] | undefined;

export type PhiNextProxyRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export type PhiNextProxyConfig = {
  upstreamBaseUrl: string;
  upstreamPrefix: string;
  timeoutMs: number;
  logLabel: string;
  missingBaseUrlMessage: string;
  buildHeaders: (request: NextRequest, path: PhiProxyPath) => Headers;
  buildFetchInit?: (
    request: NextRequest,
    path: PhiProxyPath,
  ) => Pick<RequestInit, "cache"> & { next?: { revalidate?: number; tags?: string[] } };
  /**
   * A request that may take longer than `timeoutMs` because its body is large, answered `null`: it is
   * bounded by the browser alone -- aborted when the browser goes away (`request.signal`) -- and not
   * by the clock. Every request this does not name keeps `timeoutMs`. A door names only what it must:
   * a part of a CDN upload is 16 MiB on whatever link the person has, and eight seconds cut it.
   */
  unboundedRequest?: (request: NextRequest, path: PhiProxyPath) => boolean;
};

export type PhiNextProxyHandler = (
  request: NextRequest,
  context: PhiNextProxyRouteContext,
) => Promise<Response>;

export type PhiNextProxyHandlers = {
  GET: PhiNextProxyHandler;
  HEAD: PhiNextProxyHandler;
  POST: PhiNextProxyHandler;
  PUT: PhiNextProxyHandler;
  PATCH: PhiNextProxyHandler;
  DELETE: PhiNextProxyHandler;
  OPTIONS: PhiNextProxyHandler;
};

/**
 * The catch-all's segments as a path again, each one encoded on its own.
 *
 * Next hands the segments over decoded, so joining them as they come turns an encoded `%2F` back into a
 * separator and `..` into a step upwards: `/api/site/x%2F..%2F..%2Fv1%2Fx` reached `/api/v1/*` on the
 * Server, carrying the internal token this door adds. A decoded `?` or `#` cut the path short. Encoding
 * each segment keeps it one segment; a segment that is only dots is refused, because URL parsing
 * resolves it -- percent-encoded or not -- however it is written.
 */
export function encodePhiProxyPathSegments(path: readonly string[] | undefined) {
  if (!path?.length) return "";
  for (const segment of path) {
    if (segment === "." || segment === ".." || segment === "") {
      throw new PhiProxyPathError(segment);
    }
  }
  return `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export class PhiProxyPathError extends Error {
  constructor(segment: string) {
    super(`The proxy path holds a segment it cannot forward: "${segment}".`);
    this.name = "PhiProxyPathError";
  }
}

function buildTargetUrl(
  upstreamBaseUrl: string,
  upstreamPrefix: string,
  request: NextRequest,
  path: PhiProxyPath,
) {
  const normalizedBase = upstreamBaseUrl.replace(/\/$/, "");
  const normalizedPrefix = upstreamPrefix.startsWith("/") ? upstreamPrefix : `/${upstreamPrefix}`;
  const pathSuffix = encodePhiProxyPathSegments(path);
  const targetUrl = new URL(`${normalizedBase}${normalizedPrefix}${pathSuffix}`);
  targetUrl.search = request.nextUrl.search;
  return targetUrl;
}

/** Headers that describe one connection, not the response: the runtime writes its own on the way out. */
const HOP_BY_HOP_RESPONSE_HEADERS = ["connection", "keep-alive", "transfer-encoding"];

/**
 * The upstream response's headers as the browser may see them.
 *
 * Encoding is each hop's own business. This hop to the Server negotiates for itself -- `fetch` asks for
 * gzip, deflate and br on its own and hands over a body it has already decoded
 * (`buildPhiNextProxyHeaders` does not pass the browser's `accept-encoding` on). Passing the Server's
 * `content-encoding` on then tells the browser to decode plain bytes a second time
 * (`ERR_CONTENT_DECODING_FAILED`), and a runtime that compresses route handler responses itself (Next
 * from 16.4.6) would stack a second layer on a body that still claims the first -- or, from 16.4.5, drop
 * the claim and leave a compressed body unlabelled. The `content-length` counts the compressed bytes.
 * Both go for a decoded body; the runtime frames the body it actually sends and compresses towards the
 * browser itself, as nginx does in front of it.
 */
export function buildPhiProxyResponseHeaders(upstream: Headers) {
  const headers = new Headers(upstream);
  for (const name of HOP_BY_HOP_RESPONSE_HEADERS) headers.delete(name);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return headers;
}

async function proxyRequest(
  request: NextRequest,
  path: PhiProxyPath,
  config: PhiNextProxyConfig,
) {
  if (!config.upstreamBaseUrl) {
    return Response.json(
      { message: config.missingBaseUrlMessage },
      { status: 500 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = buildTargetUrl(config.upstreamBaseUrl, config.upstreamPrefix, request, path);
  } catch (error) {
    if (error instanceof PhiProxyPathError) {
      return Response.json({ message: "Invalid path." }, { status: 400 });
    }
    throw error;
  }
  const startedAt = Date.now();

  try {
    /*
     * One way upstream for every method, so one rule for what comes back. A body is streamed through
     * (`duplex: "half"` is what fetch asks for a request body that is a stream); the answer is whatever
     * fetch decoded, never the Server's bytes as they came.
     */
    const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body !== null;
    const targetResponse = await fetch(targetUrl, {
      method: request.method,
      headers: config.buildHeaders(request, path),
      ...(hasBody ? { body: request.body, duplex: "half" } : {}),
      ...(config.buildFetchInit?.(request, path) ?? { cache: "no-store" }),
      redirect: "manual",
      signal: config.unboundedRequest?.(request, path) ? request.signal : AbortSignal.timeout(config.timeoutMs),
    } as RequestInit);

    const durationMs = Date.now() - startedAt;
    if (durationMs >= config.timeoutMs / 2 && targetResponse.ok) {
      logRuntimeEvent("warn", "proxy.request.slow", {
        area: "proxy",
        message: "Proxy request was slow.",
        method: request.method,
        path: request.nextUrl.pathname,
        status: targetResponse.status,
        durationMs,
        meta: {
          label: config.logLabel,
          upstreamUrl: targetUrl.toString(),
        },
      });
    }

    /*
     * How loud a status is depends on what it says. A 5xx is the Server failing: an error. A 409 is a write
     * the Server refused because it collides with what is there -- someone tried something and it did not
     * happen: a warning. Every other 4xx is the Server answering as designed -- no draft is a 404, a visitor
     * who is not signed in a 401 on every page -- and warned about, those buried the rest under hundreds of
     * lines a day. They stay in the log as debug, where a search for one request finds them.
     */
    if (!targetResponse.ok) {
      const level = targetResponse.status >= 500 ? "error" : targetResponse.status === 409 ? "warn" : "debug";
      logRuntimeEvent(level, "proxy.request.unhealthy_response", {
        area: "proxy",
        message: "Proxy upstream responded with a non-OK status.",
        method: request.method,
        path: request.nextUrl.pathname,
        status: targetResponse.status,
        durationMs,
        meta: {
          label: config.logLabel,
          upstreamUrl: targetUrl.toString(),
        },
      });
    }

    return new Response(targetResponse.body, {
      status: targetResponse.status,
      headers: buildPhiProxyResponseHeaders(targetResponse.headers),
    });
  } catch (error) {
    logRuntimeEvent("error", "proxy.request.failed", {
      area: "proxy",
      message: "Proxy request failed.",
      method: request.method,
      path: request.nextUrl.pathname,
      durationMs: Date.now() - startedAt,
      error,
      meta: {
        label: config.logLabel,
        upstreamUrl: targetUrl.toString(),
      },
    });

    return Response.json(
      { message: "Upstream request failed." },
      { status: 504 },
    );
  }
}

export function PhiNextProxy(config: PhiNextProxyConfig): PhiNextProxyHandlers {
  async function handle(request: NextRequest, context: PhiNextProxyRouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path, config);
  }

  return {
    GET: handle,
    HEAD: handle,
    POST: handle,
    PUT: handle,
    PATCH: handle,
    DELETE: handle,
    OPTIONS: handle,
  };
}
