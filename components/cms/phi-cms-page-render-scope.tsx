import { cache, type ReactNode } from "react";

import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { loadPhiCmsRootRequest } from "../../server-helpers/cms-root";
import { PhiRuntimeControllerServerHost } from "../runtime/runtime-controller-server-host";
import {
  collectPhiRuntimeControllerConfigOverlays,
  materializePhiRuntimeControllerSettings,
} from "../runtime/runtime-controller-materialization";
import { PhiRuntimeControllerConfigOverlays } from "../runtime/runtime-controller-config-overlays";
import { createPhiControllerSignalAddress } from "../../types/signals";
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
import { resolvePhiPageTour } from "../../server-helpers/page-tour";
import {
  PHI_PAGE_TOUR_CONFIG_KEY,
  PHI_PAGE_TOUR_CONTROLLER_FLAG,
  readPhiTourTargets,
} from "../../types/tours";

type PhiCmsResolvedRootRequest = NonNullable<Awaited<ReturnType<typeof loadPhiCmsRootRequest>>["resolvedRequest"]>;

/*
 * What a Page and every one of its Region slots share: the Area's Module scope, the Page's Tour, the tree
 * filtered for this viewer, the registry of what that tree needs, and the Controller config the tree
 * carries. None of it depends on the Region.
 *
 * The Page and its six slots render in parallel and each worked all of it out again -- up to seven
 * filters of the same tree and seven registries per request (audit R9). The root request is memoized per
 * request (`loadPhiCmsRootRequest`), so every slot holds the same object, and React's `cache` keyed by it
 * and the bridge keeps this for exactly that request.
 */
const resolvePhiCmsPageRenderBase = cache(async (
  cmsBridge: PhiCmsSiteBridge,
  resolvedRequest: PhiCmsResolvedRootRequest,
) => {
  const runtimeModuleScope = await resolvePhiCmsAreaRuntimeModuleScope({
    cmsBridge,
    area: resolvedRequest.runtime.area,
    areaPreset: resolvedRequest.areaPreset,
    serverCapabilities: resolvedRequest.serverCapabilities,
  });
  /*
   * The Page's Tour goes to whichever Controller of the Area takes Page Tours, and only then is it
   * translated and are its targets drawn live: with the Tour Module switched off a Tour costs nothing.
   */
  const pageTourControllers = [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.values()]
    .filter((descriptor) => descriptor.flags?.includes(PHI_PAGE_TOUR_CONTROLLER_FLAG));
  const pageTour = resolvedRequest.pageTour && pageTourControllers.length > 0
    ? await resolvePhiPageTour({ ...resolvedRequest.pageTour, locale: resolvedRequest.runtime.locale.current })
    : null;
  const viewerPageTree = filterPhiCmsRenderableTreeForViewer({
    tree: resolvedRequest.page,
    viewer: resolvedRequest.runtime.viewer,
    registry: buildPhiRuntimeModuleAccessRegistry(runtimeModuleScope.moduleSet),
  });
  const filteredPageTree = pageTour
    ? { ...viewerPageTree, visualAnchorTargets: readPhiTourTargets(pageTour) }
    : viewerPageTree;
  const runtimeRegistry = await resolvePhiCmsTreeRuntimeRegistry({
    moduleScope: runtimeModuleScope,
    trees: [filteredPageTree],
  });
  // What the Area runs for every Page: a Page setting for one of these configures it, it is not a second.
  const enclosingSettings = runtimeModuleScope.moduleSet.areaControllerSettings;
  const controllerConfigOverlays = collectPhiRuntimeControllerConfigOverlays({
    tree: filteredPageTree,
    ownerMountScope: "page",
    enclosingSettings,
  }).map((overlay) => {
    // A Controller type is `<pluginKey>/<key>` (buildPhiRuntimeControllerDefinitionType).
    const separator = overlay.type.lastIndexOf("/");
    return {
      address: createPhiControllerSignalAddress(
        overlay.type.slice(0, separator),
        overlay.type.slice(separator + 1),
        overlay.instanceKey,
      ),
      config: overlay.config,
    };
  });
  if (pageTour) {
    controllerConfigOverlays.push(...pageTourControllers.map((descriptor) => ({
      address: createPhiControllerSignalAddress(descriptor.pluginKey, descriptor.key, "default"),
      config: { [PHI_PAGE_TOUR_CONFIG_KEY]: pageTour },
    })));
  }
  return {
    runtimeModuleScope,
    filteredPageTree,
    runtimeRegistry,
    enclosingSettings,
    controllerConfigOverlays: controllerConfigOverlays as readonly (typeof controllerConfigOverlays)[number][],
  };
});

/**
 * What a Page and each of its Region slots work out before they render: the shared part above, and the
 * Page's Controllers for the Regions in question.
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
  const base = await resolvePhiCmsPageRenderBase(cmsBridge, resolvedRequest);
  const { runtimeModuleScope, filteredPageTree } = base;
  const pageControllerSettings = materializePhiRuntimeControllerSettings({
    tree: filteredPageTree,
    ownerMountScope: "page",
    widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
    enclosingSettings: base.enclosingSettings,
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
    runtimeRegistry: base.runtimeRegistry,
    pageControllerSettings,
    controllerConfigOverlays: base.controllerConfigOverlays,
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
      {scope.controllerConfigOverlays.length > 0 ? (
        <PhiRuntimeControllerConfigOverlays overlays={scope.controllerConfigOverlays} />
      ) : null}
      {scope.pageControllerSettings.length > 0 ? (
        <PhiRuntimeControllerServerHost
          controllers={scope.pageControllerSettings}
          runtime={runtime}
          registry={scope.controllerDefinitionsByType}
          controllerModuleIdsByType={scope.runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
          runtimeModuleCatalog={scope.runtimeRegistry.runtimeModuleCatalog}
          serverCapabilities={scope.runtimeRegistry.serverCapabilities}
        />
      ) : null}
      {children}
    </PhiRuntimeModuleDataProviderHost>
  );
}
