"use client";

import { PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS } from "../../plugins/runtime-modules/auth/ids";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableProviderRecordRequest,
} from "../../types/table-widget";
import { createPhiTableProviderClient } from "../widgets/client/shared/phi-table-provider";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../plugins/runtime-modules/auth/data-providers";

const API_PATH = "/api/auth/admin/installations";

type InstallationRow = Record<string, unknown> & {
  installationKey?: unknown;
  validation?: unknown;
};

type ApiResponse = {
  installations?: unknown;
  installation?: unknown;
  validation?: unknown;
  error?: unknown;
};

function flattenValidation(row: InstallationRow) {
  const validation = row.validation && typeof row.validation === "object" && !Array.isArray(row.validation)
    ? row.validation as Record<string, unknown>
    : null;
  return {
    ...row,
    validationStatus: typeof validation?.status === "string" ? validation.status : "untested",
    validationDetail: typeof validation?.detail === "string" ? validation.detail : null,
    validationTestedAt: typeof validation?.testedAt === "string" ? validation.testedAt : null,
  };
}

async function readApiResponse(response: Response) {
  const payload = await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    throw new PhiTableProviderError(
      "request-failed",
      typeof payload?.error === "string"
        ? payload.error
        : `Auth installation request failed with status ${response.status}.`,
    );
  }
  return payload;
}

async function getCsrfToken(signal?: AbortSignal) {
  const response = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store", signal });
  const payload = await response.json().catch(() => null) as { token?: unknown } | null;
  if (!response.ok || typeof payload?.token !== "string" || !payload.token) {
    throw new PhiTableProviderError("request-failed", "Could not initialize the secure settings request.");
  }
  return payload.token;
}

async function loadInstallations(signal?: AbortSignal) {
  const result = await readApiResponse(await fetch(API_PATH, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  return (Array.isArray(result?.installations) ? result.installations : [])
    .filter((row): row is InstallationRow =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map(flattenValidation);
}

async function queryInstallations({
  resourceKey,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  if (resourceKey !== "installations") {
    throw new PhiTableProviderError("resource-not-found", `Unknown Auth resource "${resourceKey}".`);
  }
  const rows = await loadInstallations(signal);
  return { rows, total: rows.length };
}

async function readInstallationRecord({ rowIdentity, signal }: PhiTableProviderRecordRequest) {
  const installationKey = typeof rowIdentity === "string" ? rowIdentity.trim() : "";
  if (!installationKey) {
    throw new PhiTableProviderError("invalid-query", "Installation record reading requires a key.");
  }
  const row = (await loadInstallations(signal))
    .find((entry) => entry.installationKey === installationKey);
  if (!row) {
    throw new PhiTableProviderError("invalid-response", `Unknown installation "${installationKey}".`);
  }
  return { ...row, clientSecret: "" };
}

async function mutateInstallation(request: PhiTableProviderMutationRequest) {
  if (request.resourceKey !== "installations") {
    throw new PhiTableProviderError("invalid-resource", "Invalid Auth installation resource action.");
  }
  const installationKey = "rowIdentity" in request && typeof request.rowIdentity === "string"
    ? request.rowIdentity.trim()
    : "";
  const csrfToken = await getCsrfToken(request.signal);
  const baseHeaders = {
    accept: "application/json",
    "content-type": "application/json",
    "x-csrf-token": csrfToken,
  };
  const init: RequestInit = {
    cache: "no-store",
    credentials: "include",
    signal: request.signal,
  };

  if (request.kind === "field") {
    if (
      (request.fieldKey !== "enabled" && request.fieldKey !== "loginEnabled") ||
      typeof request.proposedValue !== "boolean" ||
      !installationKey
    ) {
      throw new PhiTableProviderError("invalid-field-value", "Only the enabled switches accept boolean edits.");
    }
    const result = await readApiResponse(await fetch(`${API_PATH}/${encodeURIComponent(installationKey)}`, {
      ...init,
      method: "PATCH",
      headers: baseHeaders,
      body: JSON.stringify({ [request.fieldKey]: request.proposedValue }),
    }));
    const row = result?.installation && typeof result.installation === "object" && !Array.isArray(result.installation)
      ? flattenValidation(result.installation as InstallationRow) as Record<string, unknown>
      : null;
    const canonicalValue = row?.[request.fieldKey];
    if (!row || typeof canonicalValue !== "boolean") {
      throw new PhiTableProviderError("invalid-response", "Installation update response is invalid.");
    }
    return {
      status: "accepted" as const,
      invalidation: "none" as const,
      canonicalValue,
      rowPatch: row,
    };
  }

  if (request.kind !== "action") {
    throw new PhiTableProviderError("mutation-not-supported", "Auth installations do not support this Table mutation.");
  }
  if (request.actionKey === "refresh") {
    return { status: "accepted" as const, invalidation: "view" as const };
  }
  if (!installationKey) {
    throw new PhiTableProviderError("invalid-action-value", "This action requires an installation row.");
  }
  if (request.actionKey === "test") {
    await readApiResponse(await fetch(`${API_PATH}/${encodeURIComponent(installationKey)}/test`, {
      ...init,
      method: "POST",
      headers: baseHeaders,
    }));
    return { status: "accepted" as const, invalidation: "view" as const };
  }
  if (request.actionKey === "delete") {
    await readApiResponse(await fetch(`${API_PATH}/${encodeURIComponent(installationKey)}`, {
      ...init,
      method: "DELETE",
      headers: baseHeaders,
      body: JSON.stringify({ confirm: true }),
    }));
    return { status: "accepted" as const, invalidation: "view" as const };
  }
  throw new PhiTableProviderError("action-not-supported", `Unsupported Auth installation action "${request.actionKey}".`);
}

const resources = PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources ?? [];

export const PhiAuthInstallationsTableProviderClient = createPhiTableProviderClient({
  key: PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS.installations,
  resources,
  query: queryInstallations,
  readRecord: readInstallationRecord,
  mutate: mutateInstallation,
});
