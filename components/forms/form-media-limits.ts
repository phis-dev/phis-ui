import type { PhiCmsRuntimeRenderRegistry } from "../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiAddonMediaLimits } from "../../types/server-capabilities";

/**
 * The Media limits a Form's Media fields apply: those of the Add-on the Form's own Module is bound to
 * (its server binding's `providerId`), as the capability snapshot hands them on from the Add-on's
 * manifest (`PhiCapabilityProvider.media`). The Form's Module and not the field's: the `media-asset`
 * field belongs to the Media library and stands in Forms of any Module, and what it may take is the
 * question of whoever stores the Form's value. `undefined` for a Core-bound Module, an Add-on that states
 * none, and wherever there is no snapshot.
 */
export function resolvePhiFormMediaLimits(
  registry: Pick<PhiCmsRuntimeRenderRegistry, "runtimeModuleCatalog" | "serverCapabilities">,
  ownerModuleId: PhiRuntimeModuleId,
): PhiAddonMediaLimits | undefined {
  const providerId = registry.runtimeModuleCatalog.get(ownerModuleId)?.definition.serverBinding.providerId;
  if (!providerId) return undefined;
  return registry.serverCapabilities?.providers.find((provider) => provider.providerId === providerId)?.media;
}
