import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import {
  buildPhiMutationUrl,
  type PhiMutation,
  type PhiMutationFetchContext,
  type PhiMutationLoadOptions,
} from "./mutation";

function normalizeMutationBody(body: PhiMutationLoadOptions["body"]) {
  if (body === null || body === undefined) {
    return { body: undefined as BodyInit | undefined, contentType: undefined as string | undefined };
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return { body, contentType: undefined as string | undefined };
  }

  return {
    body: JSON.stringify(body),
    contentType: "application/json",
  };
}

export async function fetchPhiMutationJson<T>(
  source: Extract<PhiMutation, { kind: "api" }>,
  context: PhiMutationFetchContext,
  options: PhiMutationLoadOptions = {},
): Promise<T> {
  if (!context.apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchPhiMutationJson.");
  }

  const url = buildApiUrl(context.apiBaseUrl, buildPhiMutationUrl(source, { query: options.query }));
  if (!url) {
    throw new Error("Missing upstreamPath for fetchPhiMutationJson.");
  }

  const headers = buildApiHeaders({
    token: context.internalToken,
    siteKey: context.siteKey ?? "",
    includeToken: Boolean(context.internalToken.trim()),
    includeSiteKey: Boolean(context.siteKey?.trim()),
    extra: {
      Accept: "application/json",
      ...(context.userAgent ? { "User-Agent": context.userAgent } : {}),
      ...(context.extraHeaders ?? {}),
      ...(options.headers ?? {}),
    },
  });

  const normalizedBody = normalizeMutationBody(options.body);
  const requestHeaders = new Headers(headers);
  if (normalizedBody.contentType && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", normalizedBody.contentType);
  }

  const response = await fetch(url, {
    method: source.method,
    headers: requestHeaders,
    body: normalizedBody.body,
    cache: "no-store",
  });

  const responseText = await response.text().catch(() => "");
  if (!response.ok) {
    try {
      const payload = responseText ? (JSON.parse(responseText) as { error?: string }) : null;
      throw new Error(payload?.error || `Failed to execute mutation at ${source.upstreamPath}.`);
    } catch {
      throw new Error(responseText || `Failed to execute mutation at ${source.upstreamPath}.`);
    }
  }

  if (!responseText.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as T;
  }
}
