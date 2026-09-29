import "server-only";

import { cache } from "react";

import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type {
  PhiCmsSiteBridge,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiCapabilitySnapshot } from "../../types/server-capabilities";
import {
  resolvePhiRuntimeModuleSet,
  resolvePhiRuntimeRenderRegistry,
} from "../../plugins/runtime-modules/resolver";
import { resolvePhiRuntimeModuleIdsForArea } from "../../plugins/runtime-modules/settings";
import { readPhiAreaPresetRuntimeModuleIds } from "../../helpers/cms-area-config";

const resolvePhiCmsRuntimeModuleScopeForRequest = cache(
  async (
    catalog: PhiRuntimeModuleCatalog,
    area: PhiCmsAreaKey,
    moduleIdsKey: string,
    serverCapabilitiesKey: string,
  ) => {
    const moduleIds = JSON.parse(moduleIdsKey) as PhiRuntimeModuleId[];
    const serverCapabilities = JSON.parse(serverCapabilitiesKey) as PhiCapabilitySnapshot | null;
    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog,
      moduleIds,
      area,
      serverCapabilities,
    });
    const widgetDefinitionsByType = new Map(
      [...moduleSet.widgetDefinitionsByType].map(
        ([type, entry]) => [type, entry.definition] as const,
      ),
    );

    return {
      catalog,
      moduleSet,
      serverCapabilities,
      widgetDefinitionsByType,
    };
  },
);

export function resolvePhiCmsRuntimeModuleScope({
  cmsBridge,
  moduleIds,
  area,
  serverCapabilities,
}: {
  cmsBridge: PhiCmsSiteBridge;
  moduleIds?: readonly PhiRuntimeModuleId[] | null;
  area: PhiCmsAreaKey;
  serverCapabilities: PhiCapabilitySnapshot | null;
}) {
  return resolvePhiCmsRuntimeModuleScopeForRequest(
    cmsBridge.runtimeModuleCatalog,
    area,
    JSON.stringify(moduleIds ?? []),
    JSON.stringify(serverCapabilities),
  );
}

/**
 * The Module scope of an Area, from the selection its preset states.
 *
 * Which Modules this Area runs, and not which ones this person may see. A Module is area-bound and
 * never switched off for a reader (ACCESS.md); what its Widgets show may still differ per person.
 */
export function resolvePhiCmsAreaRuntimeModuleScope({
  cmsBridge,
  area,
  areaPreset,
  serverCapabilities,
}: {
  cmsBridge: PhiCmsSiteBridge;
  area: PhiCmsAreaKey;
  areaPreset: Parameters<typeof readPhiAreaPresetRuntimeModuleIds>[0];
  serverCapabilities: PhiCapabilitySnapshot | null;
}) {
  const moduleIds = resolvePhiRuntimeModuleIdsForArea(
    area,
    readPhiAreaPresetRuntimeModuleIds(areaPreset, area),
    [...cmsBridge.runtimeModuleCatalog.values()].map((entry) => entry.definition),
  );
  return resolvePhiCmsRuntimeModuleScope({ cmsBridge, moduleIds, area, serverCapabilities });
}

export function resolvePhiCmsTreeRuntimeRegistry({
  moduleScope,
  trees,
}: {
  moduleScope: Awaited<ReturnType<typeof resolvePhiCmsRuntimeModuleScope>>;
  trees: readonly PhiResolvedCmsRenderableTree[];
}) {
  return resolvePhiRuntimeRenderRegistry({
    catalog: moduleScope.catalog,
    moduleSet: moduleScope.moduleSet,
    trees,
    serverCapabilities: moduleScope.serverCapabilities,
  });
}
