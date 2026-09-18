import type { NextRequest } from "next/server";

import {
  buildPhiFormSubmitDescriptorFromHandlerProvider,
  resolvePhiFormSubmitTarget,
} from "./form-submit";
import { resolvePhiServerFormHandler } from "./form-handler-resolution";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";

/**
 * How the catalog of the Area a Form was submitted from is reached.
 *
 * A loader, because the Area is only known once the request is read, and importing all of them would
 * put every Area's Widget plugins into this graph. An Area the Site does not host answers null.
 *
 * It is derived from the Site's Bridge loader rather than injected beside it: the catalog is part of a
 * Bridge, and one thing to hand over is one thing to keep pointing at the right place.
 */
type PhiSiteAreaRuntimeModuleCatalogLoader =
  (area: PhiCmsAreaKey) => Promise<PhiRuntimeModuleCatalog | null>;

export type BuildPhiSiteFormRouteHandlersOptions = {
  upstreamBaseUrl: string;
  buildHeaders: (request: NextRequest) => Headers;
  timeoutMs: number;
  logLabel?: string;
  missingBaseUrlMessage?: string;
  /** The Bridge of the Area a Form was submitted from. See `resolvePhiServerFormHandler`. */
  loadAreaBridge: PhiSiteAreaBridgeLoader;
};

type SiteFormSubmitBody = {
  formId?: string;
  phase?: "submit" | "confirm";
  values?: unknown;
};

const PHI_SITE_SESSION_COOKIE_NAME = "phis_session";
const PHI_AUTH_LINK_COOKIE_NAME = "phis_auth_link";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJsonResponse(payload: unknown, status: number) {
  return Response.json(payload ?? {}, { status });
}

function headersToPlainObject(headers: Headers) {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function buildRelayHeaders(request: NextRequest, buildHeaders: (request: NextRequest) => Headers) {
  const headers = buildHeaders(request);
  headers.delete("cookie");
  return headers;
}

function appendCookieHeader(headers: Headers, cookiePair: string) {
  const existingCookieHeader = headers.get("cookie")?.trim() ?? "";
  if (!existingCookieHeader) {
    headers.set("cookie", cookiePair);
    return;
  }

  const [cookieName, cookieValue] = cookiePair.split("=", 2);
  if (!cookieName) {
    headers.set("cookie", existingCookieHeader);
    return;
  }

  const cookieParts = existingCookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedParts = cookieParts.map((part) => {
    if (part.startsWith(`${cookieName}=`)) {
      return `${cookieName}=${cookieValue ?? ""}`;
    }

    return part;
  });

  if (!normalizedParts.some((part) => part.startsWith(`${cookieName}=`))) {
    normalizedParts.push(cookiePair);
  }

  headers.set("cookie", normalizedParts.join("; "));
}

function appendCredentialCookieForPolicy(
  headers: Headers,
  request: NextRequest,
  credentialPolicy: "none" | "site-session" | "auth-link",
) {
  const cookieName = credentialPolicy === "site-session"
    ? PHI_SITE_SESSION_COOKIE_NAME
    : credentialPolicy === "auth-link"
      ? PHI_AUTH_LINK_COOKIE_NAME
      : null;
  if (!cookieName) return;
  const value = request.cookies.get(cookieName)?.value?.trim() ?? "";
  if (value) {
    appendCookieHeader(headers, `${cookieName}=${value}`);
  }
}

function readSetCookieHeaders(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headers.getSetCookie?.() ?? [];
}

function buildResponseWithSetCookies(payload: unknown, status: number, setCookies: string[]) {
  const response = new Response(JSON.stringify(payload ?? {}), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

  for (const setCookie of setCookies) {
    if (setCookie.trim()) {
      response.headers.append("set-cookie", setCookie);
    }
  }

  return response;
}

function readBearerToken(headers: Headers) {
  const value = headers.get("authorization")?.trim() ?? "";
  if (!value) {
    return "";
  }

  const match = /^bearer\s+(.+)$/i.exec(value);
  return (match?.[1] ?? value).trim();
}

async function readRequestBody(request: NextRequest): Promise<SiteFormSubmitBody | null> {
  try {
    const body = (await request.json()) as unknown;
    return isPlainObject(body) ? (body as SiteFormSubmitBody) : null;
  } catch {
    return null;
  }
}

async function proxyJson(
  path: string,
  proxyHeaders: Headers,
  upstreamBaseUrl: string,
  timeoutMs: number,
  init: RequestInit = {},
) {
  proxyHeaders.set("content-type", "application/json");

  const response = await fetch(`${upstreamBaseUrl}${path}`, {
      ...init,
      headers: headersToPlainObject(proxyHeaders),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

  const payload = await response.json().catch(() => null);
  return buildResponseWithSetCookies(
    payload,
    response.status,
    readSetCookieHeaders(response),
  );
}

export function buildPhiSiteFormRouteHandlers({
  upstreamBaseUrl,
  buildHeaders,
  timeoutMs,
  missingBaseUrlMessage = "Missing apiBaseUrl for /api/site/forms proxy.",
  loadAreaBridge,
}: BuildPhiSiteFormRouteHandlersOptions) {
  const loadRuntimeModuleCatalog: PhiSiteAreaRuntimeModuleCatalogLoader = async (area) =>
    (await loadAreaBridge(area))?.runtimeModuleCatalog ?? null;

  /*
   * The guard token of a Form that declares one, asked for by the browser when the Form mounts.
   *
   * It used to be minted during the server render, which tied every page with a public Form to the
   * request: the token carries the moment it was issued, so no two visitors may share a render. Issued
   * here, the page is the same for everybody. Only a Form whose submit handler is active in the Area the
   * referer names gets one -- the same gate a submit passes -- and no cookie goes along: a guard is not
   * anybody's.
   */
  async function guard(request: NextRequest, formId: string) {
    const relayHeaders = buildHeaders(request);
    const resolved = await resolvePhiServerFormHandler({
      request,
      upstreamBaseUrl,
      internalToken: readBearerToken(relayHeaders),
      siteKey: relayHeaders.get(PHIS_SITE_KEY_HEADER)?.trim() ?? "",
      formId,
      phase: "submit",
      loadRuntimeModuleCatalog,
    });
    if (!resolved) {
      return toJsonResponse({ ok: false, error: "Form handler is not active for this Area." }, 404);
    }
    const response = await fetch(
      `${upstreamBaseUrl}/api/v1/forms/guard?form=${encodeURIComponent(resolved.formId)}`,
      {
        method: "GET",
        headers: headersToPlainObject(buildRelayHeaders(request, buildHeaders)),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || typeof payload?.issuedAt !== "string" || typeof payload.formToken !== "string") {
      return toJsonResponse(
        { ok: false, error: "Could not issue a form guard." },
        response.status >= 400 ? response.status : 502,
      );
    }
    return toJsonResponse({ issuedAt: payload.issuedAt, formToken: payload.formToken }, 200);
  }

  async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase")?.trim().toLowerCase() ?? "";
    const formId = searchParams.get("formId")?.trim().toLowerCase() ?? "";
    const token = searchParams.get("token")?.trim() ?? "";

    if (phase === "guard" && formId) {
      if (!upstreamBaseUrl) {
        return toJsonResponse({ ok: false, error: missingBaseUrlMessage }, 500);
      }
      try {
        return await guard(request, formId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Form guard request failed.";
        return toJsonResponse({ ok: false, error: message }, 502);
      }
    }

    if (phase !== "preview" || !formId || !token) {
      return toJsonResponse(
        { ok: false, error: "Unsupported preview request." },
        400,
      );
    }

    if (!upstreamBaseUrl) {
      return toJsonResponse(
        { ok: false, error: missingBaseUrlMessage },
        500,
      );
    }

    const relayHeaders = buildHeaders(request);
    const resolved = await resolvePhiServerFormHandler({
      request,
      upstreamBaseUrl,
      internalToken: readBearerToken(relayHeaders),
      siteKey: relayHeaders.get(PHIS_SITE_KEY_HEADER)?.trim() ?? "",
      formId,
      phase: "preview",
      loadRuntimeModuleCatalog,
    });
    if (!resolved?.provider.upstreamPath) {
      return toJsonResponse(
        { ok: false, error: "Unsupported preview request." },
        400,
      );
    }

    // A preview carries the credentials its Provider declares and no others -- the same rule a submit
    // follows. Forwarding the browser's cookies whole handed a Site session to a handler that asked for none.
    const previewHeaders = buildRelayHeaders(request, buildHeaders);
    appendCredentialCookieForPolicy(
      previewHeaders,
      request,
      buildPhiFormSubmitDescriptorFromHandlerProvider(resolved.formId, resolved.provider).credentialPolicy,
    );
    return proxyJson(
      `${resolved.provider.upstreamPath}?token=${encodeURIComponent(token)}`,
      previewHeaders,
      upstreamBaseUrl,
      timeoutMs,
      { method: "GET" },
    );
  }

  async function POST(request: NextRequest) {
    const body = await readRequestBody(request);
    if (!body?.formId || (body.phase !== "submit" && body.phase !== "confirm")) {
      return toJsonResponse(
        { ok: false, error: "Missing form submission identity." },
        400,
      );
    }

    if (!upstreamBaseUrl) {
      return toJsonResponse(
        { ok: false, error: missingBaseUrlMessage },
        500,
      );
    }

    try {
      const relayHeaders = buildHeaders(request);
      const resolved = await resolvePhiServerFormHandler({
        request,
        upstreamBaseUrl,
        internalToken: readBearerToken(relayHeaders),
        siteKey: relayHeaders.get(PHIS_SITE_KEY_HEADER)?.trim() ?? "",
        formId: body.formId,
        phase: body.phase,
        loadRuntimeModuleCatalog,
      });
      if (!resolved) {
        return toJsonResponse({ ok: false, error: "Form handler is not active for this Area." }, 404);
      }
      const descriptor = buildPhiFormSubmitDescriptorFromHandlerProvider(resolved.formId, resolved.provider);
      const target = resolvePhiFormSubmitTarget(descriptor);
      const requestValues = body.values ?? {};
      if (target.requiresCsrf && target.csrfPath) {
        const csrfHeaders = buildRelayHeaders(request, buildHeaders);
        appendCredentialCookieForPolicy(csrfHeaders, request, descriptor.credentialPolicy);
        const csrfResponse = await fetch(`${upstreamBaseUrl}${target.csrfPath}`, {
          method: "GET",
          headers: headersToPlainObject(csrfHeaders),
          cache: "no-store",
          signal: AbortSignal.timeout(timeoutMs),
        });
        const csrfPayload = (await csrfResponse.json().catch(() => null)) as { token?: string } | null;
        const csrfToken = csrfPayload?.token?.trim() ?? "";

        if (!csrfResponse.ok || !csrfToken) {
          return toJsonResponse(
            { ok: false, error: "Could not initialize submit session." },
            csrfResponse.status >= 400 ? csrfResponse.status : 502,
          );
        }

        const proxyHeaders = buildRelayHeaders(request, buildHeaders);
        proxyHeaders.set("content-type", "application/json");
        proxyHeaders.set("x-csrf-token", csrfToken);
        appendCredentialCookieForPolicy(proxyHeaders, request, descriptor.credentialPolicy);
        appendCookieHeader(proxyHeaders, `phis_csrf=${csrfToken}`);

        const upstreamResponse = await fetch(`${upstreamBaseUrl}${target.upstreamPath}`, {
          method: descriptor.method,
          headers: headersToPlainObject(proxyHeaders),
          body: JSON.stringify(requestValues),
          cache: "no-store",
          signal: AbortSignal.timeout(timeoutMs),
        });

        const upstreamPayload = await upstreamResponse.json().catch(() => null);
        return buildResponseWithSetCookies(
          upstreamPayload,
          upstreamResponse.status,
          readSetCookieHeaders(upstreamResponse),
        );
      }

      const proxyHeaders = buildRelayHeaders(request, buildHeaders);
      proxyHeaders.set("content-type", "application/json");
      appendCredentialCookieForPolicy(proxyHeaders, request, descriptor.credentialPolicy);

      const upstreamResponse = await fetch(`${upstreamBaseUrl}${target.upstreamPath}`, {
        method: descriptor.method,
        headers: headersToPlainObject(proxyHeaders),
        body: JSON.stringify(requestValues),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });

      const upstreamPayload = await upstreamResponse.json().catch(() => null);
      return buildResponseWithSetCookies(
        upstreamPayload,
        upstreamResponse.status,
        readSetCookieHeaders(upstreamResponse),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Form dispatch failed.";
      return toJsonResponse({ ok: false, error: message }, 502);
    }
  }

  return {
    GET,
    POST,
  };
}
