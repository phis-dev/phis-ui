import "server-only";

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

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

function toHeadersObject(headers: Headers) {
  return Object.fromEntries(headers.entries());
}

/** Headers that describe one connection, not the response: the runtime writes its own on the way out. */
const HOP_BY_HOP_RESPONSE_HEADERS = ["connection", "keep-alive", "transfer-encoding"];

/**
 * The upstream response's headers as the browser may see them.
 *
 * `fetch` hands over a body it has already decoded: undici asks for gzip, deflate and br on its own and
 * undoes whatever the Server applied. Passing the Server's `content-encoding` on then tells the browser
 * to decode plain bytes a second time (`ERR_CONTENT_DECODING_FAILED`), and its `content-length` counts
 * the compressed bytes. Both go for a decoded body; the runtime frames the body it actually sends.
 * Asking upstream for `identity` instead would rest on the Server honouring it -- this holds either way.
 */
export function buildPhiProxyResponseHeaders(upstream: Headers, options: { bodyDecoded: boolean }) {
  const headers = new Headers(upstream);
  for (const name of HOP_BY_HOP_RESPONSE_HEADERS) headers.delete(name);
  if (options.bodyDecoded) {
    headers.delete("content-encoding");
    headers.delete("content-length");
  }
  return headers;
}

function buildResponseHeaders(headers: Record<string, string | string[] | undefined>) {
  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (HOP_BY_HOP_RESPONSE_HEADERS.includes(key.toLowerCase())) {
      continue;
    }
    if (typeof value === "string") {
      responseHeaders.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        responseHeaders.append(key, item);
      }
    }
  }
  return responseHeaders;
}

async function proxyRequestWithNodeHttp(
  request: NextRequest,
  targetUrl: URL,
  headers: Headers,
  timeoutMs: number,
) {
  const transport = targetUrl.protocol === "https:" ? httpsRequest : httpRequest;
  const requestHeaders = toHeadersObject(headers);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  return await new Promise<Response>((resolve, reject) => {
    const proxyRequest = transport(
      targetUrl,
      {
        method: request.method,
        headers: requestHeaders,
      },
      (proxyResponse) => {
        const chunks: Buffer[] = [];

        proxyResponse.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        proxyResponse.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: proxyResponse.statusCode ?? 502,
              headers: buildResponseHeaders(proxyResponse.headers),
            }),
          );
        });

        proxyResponse.on("error", reject);
      },
    );

    const timeoutHandle = setTimeout(() => {
      proxyRequest.destroy(new Error("Proxy request timed out."));
    }, timeoutMs);
    timeoutHandle.unref?.();

    proxyRequest.on("error", reject);
    proxyRequest.on("close", () => clearTimeout(timeoutHandle));

    if (!hasBody || !request.body) {
      proxyRequest.end();
      return;
    }

    const bodyStream = Readable.fromWeb(request.body as NodeReadableStream<Uint8Array>);
    bodyStream.on("error", reject);
    bodyStream.pipe(proxyRequest);
  });
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
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const targetResponse = hasBody
      ? await proxyRequestWithNodeHttp(
          request,
          targetUrl,
          config.buildHeaders(request, path),
          config.timeoutMs,
        )
      : await fetch(targetUrl, {
          method: request.method,
          headers: config.buildHeaders(request, path),
          ...(config.buildFetchInit?.(request, path) ?? { cache: "no-store" }),
          redirect: "manual",
          signal: AbortSignal.timeout(config.timeoutMs),
        });

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

    if (!targetResponse.ok) {
      logRuntimeEvent("warn", "proxy.request.unhealthy_response", {
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

    // The Node path hands over the Server's bytes as they came, still encoded; `fetch` decoded them.
    return new Response(targetResponse.body, {
      status: targetResponse.status,
      headers: hasBody
        ? targetResponse.headers
        : buildPhiProxyResponseHeaders(targetResponse.headers, { bodyDecoded: true }),
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
