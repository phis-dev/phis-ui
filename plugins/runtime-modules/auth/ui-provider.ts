import type {
  PhiBlockRuntime,
  PhiCmsAreaKey,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../../../types";
import { createPhiControllerSignalAddress } from "../../../types/signals";

export function resolvePhiAuthUiRuntimeProjection(
  catalog: PhiRuntimeModuleCatalog,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
  area: PhiCmsAreaKey,
): PhiBlockRuntime["authUiProvider"] {
  const providers = [...activeModuleIds].flatMap((moduleId) => {
    const definition = catalog.get(moduleId)?.definition;
    const provider = definition?.authUiProvider;
    const controller = definition?.controller;
    if (!provider || !controller) {
      return [];
    }
    const capabilities = provider.capabilitiesByArea[area];
    return capabilities?.length ? [{ moduleId, provider, controller, capabilities }] : [];
  });

  if (providers.length > 1) {
    throw new Error(
      `Area resolves more than one Auth UI provider: ${providers.map(({ moduleId }) => moduleId).join(", ")}.`,
    );
  }

  const resolved = providers[0];
  if (!resolved) {
    return null;
  }

  return {
    moduleId: resolved.moduleId,
    providerKey: resolved.provider.providerKey,
    capabilities: resolved.capabilities,
    ...(resolved.provider.accountSecurityPath
      ? { accountSecurityPath: resolved.provider.accountSecurityPath }
      : {}),
    controllerAddress: createPhiControllerSignalAddress(
      resolved.controller.pluginKey,
      resolved.controller.key,
      "default",
    ),
  };
}
