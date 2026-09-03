import type { NextRequest } from "next/server";

import {
  buildPhiFormSubmitDescriptorFromHandlerProvider,
  resolvePhiFormSubmitTarget,
} from "./form-submit";
import { resolvePhiServerFormHandler } from "./form-handler-resolution";
import type { PhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";

export type BuildPhiSiteFormRouteHandlersOptions = {
  upstreamBaseUrl: string;
  buildHeaders: (request: NextRequest) => Headers;
  timeoutMs: number;
  logLabel?: string;
  missingBaseUrlMessage?: string;
  runtimeModuleCatalog?: PhiRuntimeModuleCatalog;
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
  request: NextRequest,
  path: string,
  buildHeaders: (request: NextRequest) => Headers,
  upstreamBaseUrl: string,
  timeoutMs: number,
  init: RequestInit = {},
) {
  const proxyHeaders = buildHeaders(request);
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
  runtimeModuleCatalog,
}: BuildPhiSiteFormRouteHandlersOptions) {
  async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase")?.trim().toLowerCase() ?? "";
    const formId = searchParams.get("formId")?.trim().toLowerCase() ?? "";
    const token = searchParams.get("token")?.trim() ?? "";

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
      runtimeModuleCatalog,
    });
    if (!resolved?.provider.upstreamPath) {
      return toJsonResponse(
        { ok: false, error: "Unsupported preview request." },
        400,
      );
    }

    return proxyJson(
      request,
      `${resolved.provider.upstreamPath}?token=${encodeURIComponent(token)}`,
      buildHeaders,
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
        runtimeModuleCatalog,
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
