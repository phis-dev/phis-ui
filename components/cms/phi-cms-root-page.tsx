import { forbidden, notFound, redirect, unauthorized } from "next/navigation";

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import {
  hasPhiCmsRevisionPreview,
  loadPhiCmsRootRequest,
} from "../../server-helpers/cms-root";
import { PhiCmsPageRenderer } from "./phi-cms-page-renderer";
import { PhiHardForward } from "./phi-hard-forward";
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
import { readPhiAreaPresetRuntimeModuleIds } from "../../helpers/cms-area-config";

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

  // Still here as well as in the Layout: the Layout answers a document request, this answers a client
  // navigation that stayed inside the same branch and never re-ran it. The request path is passed so a
  // forward onto the current path is refused here too -- streamed into a client navigation, such a
  // forward repeats at request speed.
  const pageRedirect = resolvePhiCmsPageRedirect(
    resolvedRequest.page.page,
    resolvedRoute.locale,
    request.pathname,
  );
  if (pageRedirect) {
    /*
     * The same split the Layout makes, for the case the Layout does not see.
     *
     * A change of Area re-runs the Layout, and that is where a crossing is answered -- measured. What
     * reaches here is the navigation the Layout's own comment names: one inside an Area, where the Layout
     * is not re-rendered and this Page is. A `redirect()` serialised into a client navigation is what the
     * router struggles with, so a navigation is handed to the browser and a document request keeps its
     * 307 (components/cms/phi-hard-forward.tsx).
     *
     * Only ever cold either way: a warm door is answered by the proxy as a real 307 before anything here
     * renders.
     */
    if (request.clientNavigation) {
      return <PhiHardForward href={pageRedirect.href} />;
    }
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

  /*
   * Which Modules this Area runs, and not which ones this person may see. A Module is area-bound and
   * never switched off for a reader (ACCESS.md); what its Widgets show may still differ per person.
   */
  const runtimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    resolvedRequest.runtime.area,
    readPhiAreaPresetRuntimeModuleIds(resolvedRequest.areaPreset, resolvedRequest.runtime.area),
    [...cmsBridge.runtimeModuleCatalog.values()].map((entry) => entry.definition),
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
    baseSettings: resolvedRequest.page.controllerSettings ?? null,
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
