import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { createPhiAssetRuntimeModuleServerAreaContribution } from "../asset/server";
import { createPhiCoreRuntimeModuleServerAreaContribution } from "../core/server";
import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../core/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../asset/ids";

type PhiCommonRuntimeModuleRoutes = Partial<Record<
  | typeof PHI_CORE_RUNTIME_MODULE_ID
  | typeof PHI_ASSET_RUNTIME_MODULE_ID,
  readonly PhiCmsRoutePresetDescriptor[]
>>;

export function createPhiCommonRuntimeModuleServerAreaContributions({
  area,
  routesByModuleId,
}: {
  area?: PhiCmsAreaKey;
  routesByModuleId?: PhiCommonRuntimeModuleRoutes;
} = {}) {
  return [
    createPhiCoreRuntimeModuleServerAreaContribution(
      routesByModuleId?.[PHI_CORE_RUNTIME_MODULE_ID],
    ),
    createPhiAssetRuntimeModuleServerAreaContribution(area),
  ] as const;
}
