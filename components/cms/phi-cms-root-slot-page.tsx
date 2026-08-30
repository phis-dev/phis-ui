import { PhiCmsRegionType } from "../../constants/phi-cms";
import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { PhiBlockRuntime } from "../../types";
import { forbidden, redirect, unauthorized } from "next/navigation";
import { resolvePhiUnauthenticatedLoginHref } from "../../server-helpers/public-login-route";
import { PhiCmsLayoutRenderer } from "./phi-cms-layout-renderer";
import { hasRenderableRegionRoot } from "./phi-cms-region-helpers";
import { loadPhiCmsRootRequest } from "../../server-helpers/cms-root";
import { performPhiCmsPageRedirect, resolvePhiCmsPageRedirect } from "./phi-cms-page-redirect";
import { isPhiCmsGatewayAuthError } from "../../gateway/errors";
import { PhiRuntimeControllerServerHost } from "../runtime/runtime-controller-server-host";
import { materializePhiRuntimeControllerSettings } from "../runtime/runtime-controller-materialization";
import {
  readPhiRuntimeModuleIds,
  resolvePhiRuntimeModuleIdsForArea,
} from "../../plugins/runtime-modules/settings";
import {
  resolvePhiCmsRuntimeModuleScope,
  resolvePhiCmsTreeRuntimeRegistry,
} from "./phi-cms-runtime-registry";
import { PhiRuntimeModuleDataProviderHost } from "../runtime/runtime-module-data-provider-host";
import { resolvePhiRuntimeControllerDefinitions } from "../../plugins/runtime-modules/resolver";
import { canPhiViewerAccess } from "../../types/access";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../../helpers/cms-access-policy";

export type PhiCmsRootSlotPageProps = {
  root: string;
  path?: string[];
  cmsBridge: PhiCmsSiteBridge;
  regionType: number;
};

function findRenderableRegion(tree: PhiResolvedCmsRenderableTree, regionType: number) {
  return tree.regions.find((region) => region.regionType === regionType);
}

function resolveSlotClassName(regionType: number) {
  switch (regionType) {
    case PhiCmsRegionType.HeaderBottom:
      return "phi-shell-region header_bottom";
    case PhiCmsRegionType.Hero:
      return "phi-shell-region hero";
    case PhiCmsRegionType.SiderRight:
      return "sider_right";
    case PhiCmsRegionType.FooterTop:
      return "phi-shell-region footer_top";
    default:
      return undefined;
  }
}

function resolveSlotStackGap(regionType: number) {
  return regionType === PhiCmsRegionType.SiderRight ? 0 : undefined;
}

export async function PhiCmsRootSlotPage({
  root,
  path,
  cmsBridge,
  regionType,
}: PhiCmsRootSlotPageProps) {
  let rootRequest: Awaited<ReturnType<typeof loadPhiCmsRootRequest>>;
  try {
    rootRequest = await loadPhiCmsRootRequest({
      root,
      path,
      cmsBridge,
    });
  } catch (error) {
    if (isPhiCmsGatewayAuthError(error)) {
      if (error.status === 401) {
        // Mirrors the Layout: offer the sign-in route when one exists, refuse outright when none does.
        const login = await resolvePhiUnauthenticatedLoginHref(cmsBridge, root);
        if (login) {
          redirect(login);
        }
        unauthorized();
      }
      forbidden();
    }
    throw error;
  }
  const { resolvedRequest } = rootRequest;

  if (!resolvedRequest) {
    return null;
  }

  const pageRedirect = resolvePhiCmsPageRedirect(resolvedRequest.page.page, resolvedRequest.runtime.locale.current);
  if (pageRedirect) {
    performPhiCmsPageRedirect(pageRedirect);
  }

  const region = findRenderableRegion(resolvedRequest.page, regionType);
  if (!region || !hasRenderableRegionRoot(resolvedRequest.page, region.rootLayoutNodeId)) {
    return null;
  }

  const runtimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    resolvedRequest.runtime.area,
    readPhiRuntimeModuleIds(
      resolvedRequest.areaPreset?.runtimeModuleIds ?? resolvedRequest.areaPreset?.preset.config.runtimeModules,
    ),
    [...cmsBridge.runtimeModuleCatalog.values()].map((entry) => entry.definition),
  ).filter((moduleId) =>
    canPhiViewerAccess(
      resolvedRequest.runtime.viewer,
      cmsBridge.runtimeModuleCatalog.get(moduleId)?.definition.accessPolicy,
    )
  );
  const runtimeModuleScope = await resolvePhiCmsRuntimeModuleScope({
    cmsBridge,
    moduleIds: runtimeModuleIds,
    area: resolvedRequest.runtime.area,
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
  const filteredRegion = findRenderableRegion(filteredPageTree, regionType);
  if (
    !filteredRegion ||
    !hasRenderableRegionRoot(filteredPageTree, filteredRegion.rootLayoutNodeId)
  ) {
    return null;
  }
  const pageControllerSettings = materializePhiRuntimeControllerSettings({
    tree: filteredPageTree,
    ownerMountScope: "page",
    widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
    baseSettings: null,
    activeControllerTypes: [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.keys()],
    regionTypes: [regionType],
  });
  const controllerDefinitionsByType = await resolvePhiRuntimeControllerDefinitions({
    catalog: cmsBridge.runtimeModuleCatalog,
    moduleSet: runtimeModuleScope.moduleSet,
    settings: pageControllerSettings,
  });

  return (
    <PhiRuntimeModuleDataProviderHost
      providerKeys={[...runtimeRegistry.dataProviderDescriptorsByKey.keys()]}
    >
      {pageControllerSettings.length > 0 ? (
        <PhiRuntimeControllerServerHost
          controllers={pageControllerSettings}
          runtime={resolvedRequest.runtime as PhiBlockRuntime}
          registry={controllerDefinitionsByType}
          controllerModuleIdsByType={runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
          runtimeModuleCatalog={runtimeRegistry.runtimeModuleCatalog}
        />
      ) : null}
      <PhiCmsLayoutRenderer
        tree={filteredPageTree}
        runtime={resolvedRequest.runtime as PhiBlockRuntime}
        regionClassName={resolveSlotClassName(regionType)}
        regionTypes={[regionType]}
        stackGap={resolveSlotStackGap(regionType)}
        registry={runtimeRegistry}
      />
    </PhiRuntimeModuleDataProviderHost>
  );
}
