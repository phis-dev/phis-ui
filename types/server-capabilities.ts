export const PHI_CORE_SERVER_PROVIDER_ID = "@phis/server/core" as const;

export const PHI_CORE_SERVER_CAPABILITY = {
  AuthV1: "@phis/server/authentication:v1",
  ThreadsV1: "@phis/server/threads:v1",
  ResourceLinksV1: "@phis/server/resource-links:v1",
  SupportV1: "@phis/server/support:v1",
} as const;

/*
 * The capability vocabulary itself is the contract's, re-exported here so the readers in this package
 * keep one import path. What stays below is this side's own: how a Runtime Module binds to a provider,
 * which is a question phis never asks.
 */
export type {
  PhiCapabilityDescriptor,
  PhiCapabilityId,
  PhiCapabilityProvider,
  PhiCapabilityProviderId,
  PhiCapabilitySnapshot,
  PhiCapabilityState,
} from "@phis/contracts/server-capabilities";
import type {
  PhiCapabilityId,
  PhiCapabilityProviderId,
  PhiCapabilityState,
} from "@phis/contracts/server-capabilities";

export type PhiRuntimeModuleServerBinding = {
  providerId: PhiCapabilityProviderId;
  requiredCapabilities: readonly PhiCapabilityId[];
};

export type PhiRuntimeModuleServerBindingResolution =
  | { available: true }
  | {
      available: false;
      state: PhiCapabilityState;
      diagnosticCode: string;
      missingCapabilities: readonly PhiCapabilityId[];
    };

export function createPhiCoreServerBinding(
  ...requiredCapabilities: readonly PhiCapabilityId[]
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
