import type {
  PhiRuntimeModuleServerBinding,
  PhiRuntimeModuleServerBindingResolution,
  PhiCapabilitySnapshot,
} from "../../types/server-capabilities";
import { PHI_CORE_SERVER_PROVIDER_ID } from "../../types/server-capabilities";

/**
 * Whether a Module's server half is there, on this Site, in the shape it was built against.
 *
 * A binding naming no capability still says something, and only for Core does it say nothing worth
 * checking: Core is the process doing the rendering, so it cannot be absent, and the snapshot is
 * legitimately missing wherever there is no Site to take one of -- authoring tools, validation scripts.
 * Requiring one there would take every built-in Module out of service in exactly those places.
 *
 * Anywhere else the provider is an Add-on, and "my server half is installed and enabled here" is a
 * statement that can be false. Reading the empty list as "nothing to check" made it unfalsifiable: a
 * Module bound to an Add-on that was never installed rendered anyway, and the failure arrived as every
 * one of its requests missing a route.
 */
export function resolvePhiRuntimeModuleServerBinding(
  binding: PhiRuntimeModuleServerBinding,
  snapshot: PhiCapabilitySnapshot | null,
): PhiRuntimeModuleServerBindingResolution {
  if (
    binding.providerId === PHI_CORE_SERVER_PROVIDER_ID
    && binding.requiredCapabilities.length === 0
  ) {
    return { available: true };
  }
  if (!snapshot) {
    return {
      available: false,
      state: "unavailable",
      diagnosticCode: "capability_snapshot_unavailable",
      missingCapabilities: binding.requiredCapabilities,
    };
  }
  const provider = snapshot.providers.find(({ providerId }) => providerId === binding.providerId);
  if (!provider) {
    return {
      available: false,
      state: "missing",
      diagnosticCode: "provider_missing",
      missingCapabilities: binding.requiredCapabilities,
    };
  }
  const availableCapabilities = new Set(provider.capabilities.map(({ id }) => id));
  const missingCapabilities = binding.requiredCapabilities.filter(
    (capability) => !availableCapabilities.has(capability),
  );
  if (provider.state !== "available" || missingCapabilities.length > 0) {
    return {
      available: false,
      state: provider.state === "available" ? "missing" : provider.state,
      diagnosticCode: provider.diagnosticCode ?? (
        missingCapabilities.length > 0 ? "capability_missing" : "provider_unavailable"
      ),
      missingCapabilities,
    };
  }
  return { available: true };
}
