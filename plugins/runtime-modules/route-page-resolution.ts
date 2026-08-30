import type {
  PhiCmsPresetIdentity,
  PhiCmsRoutePresetBinding,
} from "../../types/cms-module-descriptors";

export type PhiCmsRoutePageLoader<TPage> = (
  path: string,
  sourcePreset: PhiCmsPresetIdentity | null,
) => Promise<TPage | null>;

export async function resolvePhiCmsRoutePage<TPage>({
  binding,
  requestedPath,
  loadPage,
  instantiatePreset,
}: {
  binding: PhiCmsRoutePresetBinding | null;
  requestedPath: string;
  loadPage: PhiCmsRoutePageLoader<TPage>;
  instantiatePreset: (binding: PhiCmsRoutePresetBinding) => Promise<TPage | null>;
}): Promise<TPage | null> {
  if (!binding) {
    return loadPage(requestedPath, null);
  }

  const sourcePreset = {
    ownerModuleId: binding.descriptor.ownerModuleId,
    presetKey: binding.descriptor.presetKey,
  } satisfies PhiCmsPresetIdentity;
  const isDynamicRoute = Object.keys(binding.params).length > 0;
  const exactSitePage = isDynamicRoute
    ? await loadPage(requestedPath, null)
    : null;

  return exactSitePage ??
    await loadPage(requestedPath, sourcePreset) ??
    await instantiatePreset(binding);
}
