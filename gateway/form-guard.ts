import "server-only";

import { fetchPhiDataSourceJson } from "./data-source-fetch";
import type { PhiDataSource } from "./data-source";

export type SupportedForm = string;

export type FormGuardResponse = {
  issuedAt: string;
  formToken: string;
};

export type FetchFormGuardOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  form: SupportedForm;
};

export async function fetchFormGuard({
  apiBaseUrl,
  internalToken,
  siteKey,
  form,
}: FetchFormGuardOptions): Promise<FormGuardResponse> {
  if (!apiBaseUrl.trim()) {
    throw new Error("Missing apiBaseUrl for fetchFormGuard.");
  }
  if (!internalToken.trim()) {
    throw new Error("Missing internalToken for fetchFormGuard.");
  }
  if (!siteKey.trim()) {
    throw new Error("Missing siteKey for fetchFormGuard.");
  }

  const source: Extract<PhiDataSource, { kind: "api" }> = {
    kind: "api",
    upstreamPath: "/api/v1/forms/guard",
    endpointKey: "guard",
    method: "GET",
    transport: "relay",
    requestShape: {
      queryMap: {
        form: "form",
      },
    },
    // Every render needs its own issuedAt: a cached guard freezes the token for all visitors, and
    // phis-server refuses it as expired once maxSubmitMs has passed since the first fetch.
    cache: {
      mode: "no-store",
    },
  };

  return fetchPhiDataSourceJson<FormGuardResponse>(source, {
    apiBaseUrl,
    internalToken,
    siteKey,
    userAgent: "phis-ui/1.0",
  }, {
    query: {
      form,
    },
  });
}
