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
