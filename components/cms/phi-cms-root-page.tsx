import { forbidden, notFound, redirect, unauthorized } from "next/navigation";

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import {
  hasPhiCmsRevisionPreview,
  loadPhiCmsRootRequest,
} from "../../server-helpers/cms-root";
import { PhiCmsPageRenderer } from "./phi-cms-page-renderer";
import { localizeAreaPath } from "../../helpers/locale";
import {
  resolvePhiPublicLoginHref,
  resolvePhiUnauthenticatedLoginHref,
} from "../../server-helpers/public-login-route";
import { resolvePhiCmsPageRedirect, performPhiCmsPageRedirect } from "./phi-cms-page-redirect";
import { PhiCmsPageMetaSignalEmitter } from "./phi-cms-page-meta-signal-emitter";
import { isPhiCmsGatewayAuthError } from "../../gateway/errors";
import { PhiRuntimeControllerServerHost } from "../runtime/runtime-controller-server-host";
import { materializePhiRuntimeControllerSettings } from "../runtime/runtime-controller-materialization";
import { PhiCmsRegionType } from "../../constants/phi-cms";
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
import { resolvePhiCmsDescriptorCatalog } from "../../plugins/runtime-modules/descriptor-compiler";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../../helpers/cms-access-policy";
import { readPhiAreaPresetRuntimeModules } from "../../helpers/cms-area-config";

export type PhiCmsRootPageProps = {
  root: string;
  path?: string[];
  cmsBridge: PhiCmsSiteBridge;
};

export async function PhiCmsRootPage({
  root,
  path,
  cmsBridge,
}: PhiCmsRootPageProps) {
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
  const { resolvedRoute, request, resolvedRequest } = rootRequest;
  const isRevisionPreview = hasPhiCmsRevisionPreview(request.searchParams);

  if (resolvedRoute.canonicalHref) {
    redirect(resolvedRoute.canonicalHref);
  }

  if (!resolvedRequest) {
    notFound();
  }

  const pageRedirect = resolvePhiCmsPageRedirect(resolvedRequest.page.page, resolvedRoute.locale);
  if (pageRedirect) {
    // Still here as well as in the Layout: the Layout answers a document request, this answers a client
    // navigation that stayed inside the same branch and never re-ran it.
    performPhiCmsPageRedirect(pageRedirect);
  }

  const areaDefinition = resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog)
    .areaDefinitions.get(resolvedRoute.area);
  if (
    !isRevisionPreview &&
    resolvedRoute.rootKind === "area" &&
    areaDefinition &&
    !canPhiViewerAccess(resolvedRequest.runtime.viewer, areaDefinition.accessPolicy) &&
    resolvedRequest.runtime.viewer.resolvedArea
  ) {
    if (resolvedRequest.runtime.viewer.access === "public" && resolvedRoute.area !== "public") {
      // Mirrors the Layout guard: fail closed rather than redirect to a route the Auth Module may not
      // contribute. See AUTHENTICATION.md section 6.
      const login = await resolvePhiPublicLoginHref(
        cmsBridge,
        resolvedRoute.locale,
        resolvedRequest.runtime.viewer,
        resolvedRequest.serverCapabilities,
      );
      if (!login) {
        unauthorized();
      }
      const next = request.pathname?.trim() || `/${resolvedRoute.area}`;
      redirect(`${login}?${new URLSearchParams({ next }).toString()}`);
    }
    redirect(localizeAreaPath(resolvedRoute.locale, resolvedRequest.runtime.viewer.resolvedArea, "/"));
  }

  const runtimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    resolvedRequest.runtime.area,
    readPhiRuntimeModuleIds(
      readPhiAreaPresetRuntimeModules(resolvedRequest.areaPreset),
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
  const pageControllerSettings = materializePhiRuntimeControllerSettings({
    tree: filteredPageTree,
    ownerMountScope: "page",
    widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
    baseSettings: null,
    activeControllerTypes: [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.keys()],
    regionTypes: [PhiCmsRegionType.Content],
    includeOverlays: true,
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
          runtime={resolvedRequest.runtime}
          registry={controllerDefinitionsByType}
          controllerModuleIdsByType={runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
          runtimeModuleCatalog={runtimeRegistry.runtimeModuleCatalog}
        />
      ) : null}
      <PhiCmsPageMetaSignalEmitter
        area={resolvedRequest.runtime.area}
        pagePath={resolvedRequest.runtime.page?.path ?? null}
        pageType={resolvedRequest.runtime.page?.pageType ?? null}
        title={resolvedRequest.runtime.page?.title ?? null}
        description={resolvedRequest.runtime.page?.description ?? null}
      />
      <PhiCmsPageRenderer
        tree={filteredPageTree}
        runtime={resolvedRequest.runtime}
        registry={runtimeRegistry}
      />
    </PhiRuntimeModuleDataProviderHost>
  );
}
