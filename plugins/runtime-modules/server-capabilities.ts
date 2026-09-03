import type {
  PhiRuntimeModuleServerBinding,
  PhiRuntimeModuleServerBindingResolution,
  PhiCapabilitySnapshot,
} from "../../types/server-capabilities";

export function resolvePhiRuntimeModuleServerBinding(
  binding: PhiRuntimeModuleServerBinding,
  snapshot: PhiCapabilitySnapshot | null,
): PhiRuntimeModuleServerBindingResolution {
  if (binding.requiredCapabilities.length === 0) {
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
