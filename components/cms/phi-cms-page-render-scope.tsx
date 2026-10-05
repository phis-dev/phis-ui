import type { ReactNode } from "react";

import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { loadPhiCmsRootRequest } from "../../server-helpers/cms-root";
import { PhiRuntimeControllerServerHost } from "../runtime/runtime-controller-server-host";
import { materializePhiRuntimeControllerSettings } from "../runtime/runtime-controller-materialization";
import { PhiRuntimeModuleDataProviderHost } from "../runtime/runtime-module-data-provider-host";
import { resolvePhiRuntimeControllerDefinitions } from "../../plugins/runtime-modules/resolver";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../../helpers/cms-access-policy";
import {
  resolvePhiCmsAreaRuntimeModuleScope,
  resolvePhiCmsTreeRuntimeRegistry,
} from "./phi-cms-runtime-registry";

type PhiCmsResolvedRootRequest = NonNullable<Awaited<ReturnType<typeof loadPhiCmsRootRequest>>["resolvedRequest"]>;

/**
 * What a Page and each of its Region slots work out before they render: the Module scope of the Area,
 * the tree filtered to what this viewer may see, the registry of what the tree needs, and the Page's
 * Controllers for the Regions in question.
 *
 * The Page and the slot used to carry this as two copies, four blocks apart, and the slot's trailed the
 * Page's. One resolution, parameterised by the Regions it is for.
 */
export async function resolvePhiCmsPageRenderScope({
  cmsBridge,
  resolvedRequest,
  regionTypes,
  includeOverlays = false,
}: {
  cmsBridge: PhiCmsSiteBridge;
  resolvedRequest: PhiCmsResolvedRootRequest;
  regionTypes: number[];
  includeOverlays?: boolean;
}) {
  const runtimeModuleScope = await resolvePhiCmsAreaRuntimeModuleScope({
    cmsBridge,
    area: resolvedRequest.runtime.area,
    areaPreset: resolvedRequest.areaPreset,
    serverCapabilities: resolvedRequest.serverCapabilities,
  });
  const filteredPageTree = filterPhiCmsRenderableTreeForViewer({
    tree: resolvedRequest.page,
    viewer: resolvedRequest.runtime.viewer,
    registry: buildPhiRuntimeModuleAccessRegistry(runtimeModuleScope.moduleSet),
  });
  const runtimeRegistry = await resolvePhiCmsTreeRuntimeRegistry({
    moduleScope: runtimeModuleScope,
    trees: [filteredPageTree],
  });
  const pageControllerSettings = materializePhiRuntimeControllerSettings({
    tree: filteredPageTree,
    ownerMountScope: "page",
    widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
    baseSettings: resolvedRequest.page.controllerSettings ?? null,
    activeControllerTypes: [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.keys()],
    regionTypes,
    ...(includeOverlays ? { includeOverlays: true } : {}),
  });
  const controllerDefinitionsByType = await resolvePhiRuntimeControllerDefinitions({
    catalog: cmsBridge.runtimeModuleCatalog,
    moduleSet: runtimeModuleScope.moduleSet,
    settings: pageControllerSettings,
  });
  return {
    runtimeModuleScope,
    filteredPageTree,
    runtimeRegistry,
    pageControllerSettings,
    controllerDefinitionsByType,
  };
}

export type PhiCmsPageRenderScope = Awaited<ReturnType<typeof resolvePhiCmsPageRenderScope>>;

/** The Data Provider host and the Page's Controllers around what a Page or a slot renders. */
export function PhiCmsPageRuntimeHosts({
  scope,
  runtime,
  children,
}: {
  scope: PhiCmsPageRenderScope;
  runtime: PhiBlockRuntime;
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleDataProviderHost
      providerKeys={[...scope.runtimeRegistry.dataProviderDescriptorsByKey.keys()]}
    >
      {scope.pageControllerSettings.length > 0 ? (
        <PhiRuntimeControllerServerHost
          controllers={scope.pageControllerSettings}
          runtime={runtime}
          registry={scope.controllerDefinitionsByType}
          controllerModuleIdsByType={scope.runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
          runtimeModuleCatalog={scope.runtimeRegistry.runtimeModuleCatalog}
        />
      ) : null}
      {children}
    </PhiRuntimeModuleDataProviderHost>
  );
}
