import "server-only";

import {
  PHI_BUILDER_AREA_KEYS,
  resolvePhiBuilderAreaAsCmsArea,
  type PhiBuilderAreaKey,
} from "../../../constants/cms-areas";
import {
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
} from "../../../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiBlockRuntime,
  PhiCmsResolvedNavigationSurface,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../../../types";
import { fetchSiteNavigationScopes } from "../../../gateway/site-nav";
import { createPhiBuilderCustomNavigationSurface } from "../../../helpers/cms-navigation-catalog";

export type PhiBuilderNavigationSurfacesByArea = Partial<
  Record<PhiBuilderAreaKey, readonly PhiCmsResolvedNavigationSurface[]>
>;

export async function buildPhiBuilderNavigationSurfacesByArea(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
  optionalModuleIdsByArea: Readonly<Record<string, readonly PhiRuntimeModuleId[]>>,
): Promise<PhiBuilderNavigationSurfacesByArea> {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const platformModuleId = runtimeModuleCatalog.platformModuleId;
  if (!platformModuleId) {
    throw new Error("Builder runtime catalog has no Platform contribution.");
  }
  const persistedScopes = await fetchSiteNavigationScopes({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
  });
  return Object.fromEntries(PHI_BUILDER_AREA_KEYS.map((builderArea) => {
    const area = resolvePhiBuilderAreaAsCmsArea(builderArea);
    const areaDefinition = catalog.areaDefinitions.get(area);
    if (!areaDefinition) {
      throw new Error(`Builder target Area "${area}" has no descriptor definition.`);
    }
    const activeModuleIds = new Set<PhiRuntimeModuleId>([
      platformModuleId,
      areaDefinition.baseModuleId,
      ...(optionalModuleIdsByArea[builderArea] ?? []),
    ]);
    const declaredSurfaces = resolvePhiCmsActiveNavigationSurfaces({
      catalog,
      area,
      activeModuleIds,
    });
    const declaredKeys = new Set(declaredSurfaces.map((surface) => surface.navKey));
    const customSurfaces = persistedScopes
      .filter((scope) => scope.key.startsWith(`${area}:`) && !declaredKeys.has(scope.key as `${typeof area}:${string}`))
      .map((scope) => createPhiBuilderCustomNavigationSurface(scope.key, scope.label));
    return [builderArea, [...declaredSurfaces, ...customSurfaces]] as const;
  }));
}
