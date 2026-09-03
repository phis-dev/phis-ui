import "server-only";

import { buildApiHeaders, buildApiUrl } from "../helpers/site-api";
import type {
  PhiCapabilityDescriptor,
  PhiCapabilityProvider,
  PhiCapabilitySnapshot,
  PhiCapabilityState,
} from "../types/server-capabilities";

const PROVIDER_ID_PATTERN = /^@[^/]+\/[^/]+(?:\/[^/]+)*$/;
const CAPABILITY_ID_PATTERN = /^@[^/]+\/[^:]+:v[1-9]\d*$/;
const CAPABILITY_STATES = new Set<PhiCapabilityState>([
  "available",
  "missing",
  "disabled",
  "incompatible",
  "misconfigured",
  "unavailable",
]);

function parseCapability(value: unknown): PhiCapabilityDescriptor {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid server capability descriptor.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    !CAPABILITY_ID_PATTERN.test(record.id) ||
    typeof record.interfaceDigest !== "string" ||
    !record.interfaceDigest
  ) {
    throw new Error("Invalid server capability descriptor.");
  }
  return {
    id: record.id as PhiCapabilityDescriptor["id"],
    interfaceDigest: record.interfaceDigest,
  };
}

function parseProvider(value: unknown): PhiCapabilityProvider {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid server capability provider.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.providerId !== "string" ||
    !PROVIDER_ID_PATTERN.test(record.providerId) ||
    typeof record.state !== "string" ||
    !CAPABILITY_STATES.has(record.state as PhiCapabilityState) ||
    (record.diagnosticCode !== null && typeof record.diagnosticCode !== "string") ||
    !Array.isArray(record.capabilities)
  ) {
    throw new Error("Invalid server capability provider.");
  }
  return {
    providerId: record.providerId as PhiCapabilityProvider["providerId"],
    state: record.state as PhiCapabilityState,
    diagnosticCode: record.diagnosticCode as string | null,
    capabilities: record.capabilities.map(parseCapability),
  };
}

function parseSnapshot(value: unknown): PhiCapabilitySnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid server capability snapshot.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.siteKey !== "string" ||
    (record.releaseBuildId !== null && typeof record.releaseBuildId !== "string") ||
    typeof record.buildManifestDigest !== "string" ||
    !Array.isArray(record.providers)
  ) {
    throw new Error("Invalid server capability snapshot.");
  }
  return {
    siteKey: record.siteKey,
    releaseBuildId: record.releaseBuildId as string | null,
    buildManifestDigest: record.buildManifestDigest,
    providers: record.providers.map(parseProvider),
  };
}

export async function getPhiCapabilitySnapshot({
  apiBaseUrl,
  internalToken,
  siteKey,
}: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
}): Promise<PhiCapabilitySnapshot> {
  const response = await fetch(buildApiUrl(apiBaseUrl, "/api/v1/site/capabilities"), {
    headers: buildApiHeaders({
      token: internalToken,
      siteKey,
      includeToken: true,
      includeSiteKey: true,
      extra: {
        Accept: "application/json",
        "User-Agent": "phis-ui/1.0",
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve server capabilities (${response.status}).`);
  }
  const snapshot = parseSnapshot(await response.json());
  if (snapshot.siteKey !== siteKey) {
    throw new Error("Server capability snapshot belongs to a different site.");
  }
  return snapshot;
}
