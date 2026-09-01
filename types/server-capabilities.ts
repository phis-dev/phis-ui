export const PHI_CORE_SERVER_PROVIDER_ID = "@phis/server/core" as const;

export const PHI_CORE_SERVER_CAPABILITY = {
  AuthV1: "@phis/server/authentication:v1",
  ThreadsV1: "@phis/server/threads:v1",
  ResourceLinksV1: "@phis/server/resource-links:v1",
  SupportV1: "@phis/server/support:v1",
} as const;

export type PhiServerProviderId = `@${string}/${string}`;
export type PhiServerCapabilityId = `@${string}/${string}:v${number}`;

export type PhiRuntimeModuleServerBinding = {
  providerId: PhiServerProviderId;
  requiredCapabilities: readonly PhiServerCapabilityId[];
};

export type PhiServerCapabilityState =
  | "available"
  | "missing"
  | "disabled"
  | "incompatible"
  | "misconfigured"
  | "unavailable";

export type PhiServerCapabilityDescriptor = {
  id: PhiServerCapabilityId;
  interfaceDigest: string;
};

export type PhiServerCapabilityProvider = {
  providerId: PhiServerProviderId;
  state: PhiServerCapabilityState;
  diagnosticCode: string | null;
  capabilities: readonly PhiServerCapabilityDescriptor[];
};

export type PhiServerCapabilitySnapshot = {
  siteKey: string;
  releaseBuildId: string | null;
  buildManifestDigest: string;
  providers: readonly PhiServerCapabilityProvider[];
};

export type PhiRuntimeModuleServerBindingResolution =
  | { available: true }
  | {
      available: false;
      state: PhiServerCapabilityState;
      diagnosticCode: string;
      missingCapabilities: readonly PhiServerCapabilityId[];
    };

export function createPhiCoreServerBinding(
  ...requiredCapabilities: readonly PhiServerCapabilityId[]
): PhiRuntimeModuleServerBinding {
  return {
    providerId: PHI_CORE_SERVER_PROVIDER_ID,
    requiredCapabilities,
  };
}

export const PHI_CORE_SERVER_BINDING = createPhiCoreServerBinding();
export const PHI_CORE_AUTH_SERVER_BINDING = createPhiCoreServerBinding(
  PHI_CORE_SERVER_CAPABILITY.AuthV1,
);
