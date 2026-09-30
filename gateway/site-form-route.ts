import type { NextRequest } from "next/server";

import {
  buildPhiFormSubmitDescriptorFromHandlerProvider,
  resolvePhiFormSubmitTarget,
} from "./form-submit";
import { resolvePhiServerFormHandler } from "./form-handler-resolution";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { PHIS_FORM_RELAY_HEADER, PHIS_SITE_KEY_HEADER } from "../constants/http-headers";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";
import { isPhiRecord } from "../helpers/is-record";

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
  /** The Area of the page the Form was drawn in. See `resolvePhiServerFormHandler`. */
  area?: unknown;
  values?: unknown;
};

const PHI_SITE_SESSION_COOKIE_NAME = "phis_session";
const PHI_AUTH_LINK_COOKIE_NAME = "phis_auth_link";
/** Core's double-submit pair: the cookie `/api/auth/csrf` sets and the header that repeats it. */
const PHI_CSRF_COOKIE_NAME = "phis_csrf";
const PHI_CSRF_HEADER_NAME = "x-csrf-token";

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

/**
 * What goes upstream before the Provider has said what it needs: no browser cookie and no CSRF header.
 * Each is added back only where the Provider declares it.
 */
function buildRelayHeaders(request: NextRequest, buildHeaders: (request: NextRequest) => Headers) {
  const headers = buildHeaders(request);
  headers.delete("cookie");
  headers.delete(PHI_CSRF_HEADER_NAME);
  return headers;
}

/**
 * The browser's own CSRF proof: the header its script sent and the cookie its browser holds, agreeing.
 *
 * The relay used to ask Core for a fresh token on every submit and send it upstream as both halves, so
 * Core compared the relay with itself and every submit passed -- whatever page had sent it. The
 * Set-Cookie of that round trip was dropped as well, so the pair belonged to nobody. The proof has to
 * come from the browser, because only a page of this Site can read the cookie to repeat it in a header.
 */
function readBrowserCsrfToken(request: NextRequest) {
  const headerToken = request.headers.get(PHI_CSRF_HEADER_NAME)?.trim() ?? "";
  const cookieToken = request.cookies.get(PHI_CSRF_COOKIE_NAME)?.value?.trim() ?? "";
  return headerToken && headerToken === cookieToken ? headerToken : null;
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

function readArea(value: unknown) {
  return typeof value === "string" ? value : null;
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
    return isPhiRecord(body) ? (body as SiteFormSubmitBody) : null;
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
   * page names gets one -- the same gate a submit passes -- and no cookie goes along: a guard is not
   * anybody's.
   */
  async function guard(request: NextRequest, formId: string, area: string | null) {
    const relayHeaders = buildHeaders(request);
    const resolved = await resolvePhiServerFormHandler({
      request,
      upstreamBaseUrl,
      internalToken: readBearerToken(relayHeaders),
      siteKey: relayHeaders.get(PHIS_SITE_KEY_HEADER)?.trim() ?? "",
      formId,
      phase: "submit",
      area,
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
    const area = searchParams.get("area");

    if (phase === "guard" && formId) {
      if (!upstreamBaseUrl) {
        return toJsonResponse({ ok: false, error: missingBaseUrlMessage }, 500);
      }
      try {
        return await guard(request, formId, area);
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
      area,
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
        area: readArea(body.area),
        loadRuntimeModuleCatalog,
      });
      if (!resolved) {
        return toJsonResponse({ ok: false, error: "Form handler is not active for this Area." }, 404);
      }
      const descriptor = buildPhiFormSubmitDescriptorFromHandlerProvider(resolved.formId, resolved.provider);
      if (descriptor.transport !== "relay") {
        // The relay is the only transport that is carried out; relaying a handler that declared another
        // would send its values somewhere it never asked them to go.
        throw new Error(
          `Form handler ${descriptor.submitHandlerKey} declares transport "${descriptor.transport}", ` +
            "which this relay does not carry out.",
        );
      }
      const target = resolvePhiFormSubmitTarget(descriptor);
      const proxyHeaders = buildRelayHeaders(request, buildHeaders);
      proxyHeaders.set("content-type", "application/json");
      // One visitor behind this request: phis counts relayed submissions per visitor, not per Site.
      proxyHeaders.set(PHIS_FORM_RELAY_HEADER, "1");
      appendCredentialCookieForPolicy(proxyHeaders, request, descriptor.credentialPolicy);
      if (target.requiresCsrf) {
        // Checked here only so a refusal costs no round trip; Core compares the same pair again.
        const csrfToken = readBrowserCsrfToken(request);
        if (!csrfToken) {
          return toJsonResponse({ ok: false, error: "Invalid CSRF token." }, 403);
        }
        proxyHeaders.set(PHI_CSRF_HEADER_NAME, csrfToken);
        appendCookieHeader(proxyHeaders, `${PHI_CSRF_COOKIE_NAME}=${csrfToken}`);
      }

      const upstreamResponse = await fetch(`${upstreamBaseUrl}${target.upstreamPath}`, {
        method: descriptor.method,
        headers: headersToPlainObject(proxyHeaders),
        body: JSON.stringify(body.values ?? {}),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });

      // Whatever Core sets -- a new session, the CSRF token it rotates at sign-in -- is the browser's.
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
