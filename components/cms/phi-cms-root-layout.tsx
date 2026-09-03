import { forbidden, notFound, redirect, unauthorized } from "next/navigation";

import { PhiCmsRegionType } from "../../constants/phi-cms";
import type {
  PhiResolvedCmsAreaPresetTree,
} from "../../types/cms";
import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import { PhiCmsShell } from "../shell/phi-cms-shell";
import { PhiCmsLayoutRenderer, PhiCmsOverlayRenderer } from "./phi-cms-layout-renderer";
import {
  resolvePhiCmsRuntimeModuleScope,
  resolvePhiCmsTreeRuntimeRegistry,
} from "./phi-cms-runtime-registry";
import { hasRenderableRegionRoot } from "./phi-cms-region-helpers";
import {
  hasPhiCmsRevisionPreview,
  loadPhiCmsRootRequest,
} from "../../server-helpers/cms-root";
import { localizeAreaPath } from "../../helpers/locale";
import {
  resolvePhiPublicLoginHref,
  resolvePhiUnauthenticatedLoginHref,
} from "../../server-helpers/public-login-route";
import { isPhiCmsGatewayAuthError } from "../../gateway/errors";
import { PhiRuntimeControllerServerHost } from "../runtime/runtime-controller-server-host";
import {
  readPhiRuntimeModuleIds,
  resolvePhiRuntimeModuleIdsForArea,
} from "../../plugins/runtime-modules/settings";
import { materializePhiRuntimeControllerSettings } from "../runtime/runtime-controller-materialization";
import { PhiRuntimeModuleProvider } from "../runtime/runtime-module-context";
import { PhiRuntimeModuleDataProviderHost } from "../runtime/runtime-module-data-provider-host";
import { PhiSignalRuntimePartitionProvider } from "../runtime/runtime-signal-partition";
import { resolvePhiRuntimeControllerDefinitions } from "../../plugins/runtime-modules/resolver";
import { canPhiViewerAccess } from "../../types/access";
import { resolvePhiCmsDescriptorCatalog } from "../../plugins/runtime-modules/descriptor-compiler";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../../helpers/cms-access-policy";
export type PhiCmsRootLayoutProps = {
  root: string;
  cmsBridge: PhiCmsSiteBridge;
  children: React.ReactNode;
  /**
   * The path to resolve instead of the one that was requested.
   *
   * Only the root error routes pass this. They exist because a refusal by this Layout is caught above it,
   * where no Area is left to render into -- so they rebuild the shell themselves. The requested path is
   * by definition the one that did not resolve, and resolving it again here would refuse a second time.
   * Resolving the error page's own path instead yields the same Area preset and a tree that exists, so
   * the shell renders and the refusal cannot repeat. With it set, this Layout answers neither existence
   * nor canonical form: both were already answered by the render that refused.
   */
  path?: string[];
  headerBottom?: React.ReactNode;
  hero?: React.ReactNode;
  siderRight?: React.ReactNode;
  footerTop?: React.ReactNode;
  drawer?: React.ReactNode;
};

function findRegion(tree: PhiResolvedCmsAreaPresetTree, regionType: number) {
  return tree.regions.find((region) => region.regionType === regionType);
}

export async function PhiCmsRootLayout({
  root,
  cmsBridge,
  children,
  path,
  headerBottom,
  hero,
  siderRight,
  footerTop,
  drawer,
}: PhiCmsRootLayoutProps) {
  let rootScope: Awaited<ReturnType<typeof loadPhiCmsRootRequest>>;
  try {
    rootScope = await loadPhiCmsRootRequest({
      root,
      path,
      cmsBridge,
    });
  } catch (error) {
    if (isPhiCmsGatewayAuthError(error)) {
      if (error.status === 401) {
        // The Area payload itself is gated, so no runtime resolved. A visitor still deserves the sign-in
        // route when one exists; only where none does is a bare refusal the honest answer.
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
  const { resolvedRoute, request, resolvedAreaPreset, runtime } = rootScope;
  const isRevisionPreview = hasPhiCmsRevisionPreview(request.searchParams);

  if (!path && resolvedRoute.canonicalHref) {
    redirect(resolvedRoute.canonicalHref);
  }

  const areaDefinition = resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog)
    .areaDefinitions.get(resolvedRoute.area);
  if (
    !isRevisionPreview &&
    resolvedRoute.rootKind === "area" &&
    areaDefinition &&
    !canPhiViewerAccess(runtime.viewer, areaDefinition.accessPolicy) &&
    runtime.viewer.resolvedArea
  ) {
    if (runtime.viewer.access === "public" && resolvedRoute.area !== "public") {
      // Section 6 of AUTHENTICATION.md: where no active Public Auth Module owns the route, protected
      // access fails closed. Assuming it would send the visitor to a 404 that reports a missing page
      // instead of a refused one, and this Layout still runs before the shell flushes, so 401 can
      // still be the status rather than only the body.
      const login = await resolvePhiPublicLoginHref(
        cmsBridge,
        resolvedRoute.locale,
        runtime.viewer,
        rootScope.requestContext.serverCapabilities,
      );
      if (!login) {
        unauthorized();
      }
      const next = request.pathname?.trim() || `/${resolvedRoute.area}`;
      redirect(`${login}?${new URLSearchParams({ next }).toString()}`);
    }
    redirect(localizeAreaPath(resolvedRoute.locale, runtime.viewer.resolvedArea, "/"));
  }

  /**
   * Existence is answered after access, and here rather than in the Page, so the status line can still
   * say so. Deciding in the Page cannot: the shell has flushed by then and Next can only swap the body,
   * which made every unresolvable path answer 200 with the 404 page. Asking before the access guard
   * would be worse still -- a staff Area would report a missing page to anyone not allowed to see it.
   * The resolution is shared with the Page through the request cache, so asking here costs nothing.
   */
  if (!path && !rootScope.resolvedRequest) {
    notFound();
  }

  const layoutTree = resolvedAreaPreset ?? null;
  const renderRuntime = runtime;
  const runtimeModuleIds = resolvePhiRuntimeModuleIdsForArea(
    runtime.area,
    layoutTree
      ? readPhiRuntimeModuleIds(layoutTree.runtimeModuleIds ?? layoutTree.preset.config.runtimeModules)
      : null,
    [...cmsBridge.runtimeModuleCatalog.values()].map((entry) => entry.definition),
  ).filter((moduleId) =>
    canPhiViewerAccess(runtime.viewer, cmsBridge.runtimeModuleCatalog.get(moduleId)?.definition.accessPolicy)
  );
  const runtimeModuleScope = await resolvePhiCmsRuntimeModuleScope({
    cmsBridge,
    moduleIds: runtimeModuleIds,
    area: runtime.area,
    serverCapabilities: rootScope.requestContext.serverCapabilities,
  });
  const filteredLayoutTree = layoutTree
    ? filterPhiCmsRenderableTreeForViewer({
        tree: layoutTree,
        viewer: runtime.viewer,
        registry: buildPhiRuntimeModuleAccessRegistry(runtimeModuleScope.moduleSet),
      })
    : null;
  const runtimeRegistry = await resolvePhiCmsTreeRuntimeRegistry({
    moduleScope: runtimeModuleScope,
    trees: filteredLayoutTree ? [filteredLayoutTree] : [],
  });
  const headerTopRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.HeaderTop) : null;
  const headerMainRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.HeaderMain) : null;
  const siderLeftRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.SiderLeft) : null;
  const footerMainRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.Footer) : null;
  const footerBottomRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.FooterBottom) : null;
  const registeredControllerSettings = filteredLayoutTree
    ? materializePhiRuntimeControllerSettings({
        tree: filteredLayoutTree,
        ownerMountScope: "area",
        widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
        baseSettings: runtimeModuleScope.moduleSet.areaControllerSettings,
        activeControllerTypes: [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.keys()],
      })
    : null;
  const controllerDefinitionsByType = registeredControllerSettings
    ? await resolvePhiRuntimeControllerDefinitions({
        catalog: cmsBridge.runtimeModuleCatalog,
        moduleSet: runtimeModuleScope.moduleSet,
        settings: registeredControllerSettings,
      })
    : new Map();
  const hasRenderableHeaderTop = headerTopRegion
    ? hasRenderableRegionRoot(filteredLayoutTree!, headerTopRegion.rootLayoutNodeId)
    : false;
  const hasRenderableHeaderMain = headerMainRegion
    ? hasRenderableRegionRoot(filteredLayoutTree!, headerMainRegion.rootLayoutNodeId)
    : false;
  const hasRenderableSiderLeft = siderLeftRegion
    ? hasRenderableRegionRoot(filteredLayoutTree!, siderLeftRegion.rootLayoutNodeId)
    : false;
  const hasRenderableFooterMain = footerMainRegion
    ? hasRenderableRegionRoot(filteredLayoutTree!, footerMainRegion.rootLayoutNodeId)
    : false;
  const hasRenderableFooterBottom = footerBottomRegion
    ? hasRenderableRegionRoot(filteredLayoutTree!, footerBottomRegion.rootLayoutNodeId)
    : false;

  const runtimeContent = (
    <PhiRuntimeModuleDataProviderHost
      providerKeys={[...runtimeRegistry.dataProviderDescriptorsByKey.keys()]}
    >
      {registeredControllerSettings && registeredControllerSettings.length > 0 ? (
        <PhiRuntimeControllerServerHost
          controllers={registeredControllerSettings}
          runtime={renderRuntime}
          registry={controllerDefinitionsByType}
          controllerModuleIdsByType={runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
          runtimeModuleCatalog={runtimeRegistry.runtimeModuleCatalog}
        />
      ) : null}
      <PhiCmsShell
        content={children}
        headerTop={hasRenderableHeaderTop ? (
          <PhiCmsLayoutRenderer
            tree={filteredLayoutTree!}
            runtime={renderRuntime}
            regionClassName="phi-shell-region header_top"
            regionTypes={[PhiCmsRegionType.HeaderTop]}
            registry={runtimeRegistry}
          />
        ) : undefined}
        headerMain={hasRenderableHeaderMain ? (
          <PhiCmsLayoutRenderer
            tree={filteredLayoutTree!}
            runtime={renderRuntime}
            regionClassName="phi-shell-region header_main"
            regionTypes={[PhiCmsRegionType.HeaderMain]}
            registry={runtimeRegistry}
          />
        ) : undefined}
        headerBottom={headerBottom}
        hero={hero}
        siderLeft={hasRenderableSiderLeft ? (
          <PhiCmsLayoutRenderer
            tree={filteredLayoutTree!}
            runtime={renderRuntime}
            regionClassName="sider_left"
            regionTypes={[PhiCmsRegionType.SiderLeft]}
            stackGap={0}
            registry={runtimeRegistry}
          />
        ) : undefined}
        siderRight={siderRight}
        siderLeftFullHeight={siderLeftRegion?.config?.fullHeight === true && hasRenderableSiderLeft}
        footerTop={footerTop}
        drawer={drawer}
        footerMain={hasRenderableFooterMain ? (
          <PhiCmsLayoutRenderer
            tree={filteredLayoutTree!}
            runtime={renderRuntime}
            regionClassName="phi-shell-region footer_main"
            regionTypes={[PhiCmsRegionType.Footer]}
            registry={runtimeRegistry}
          />
        ) : undefined}
        footerBottom={hasRenderableFooterBottom ? (
          <PhiCmsLayoutRenderer
            tree={filteredLayoutTree!}
            runtime={renderRuntime}
            regionClassName="phi-shell-region footer_bottom"
            regionTypes={[PhiCmsRegionType.FooterBottom]}
            registry={runtimeRegistry}
          />
        ) : undefined}
      />
      {filteredLayoutTree ? (
        <PhiCmsOverlayRenderer
          tree={filteredLayoutTree}
          runtime={renderRuntime}
          registry={runtimeRegistry}
          signalScope="area"
        />
      ) : null}
    </PhiRuntimeModuleDataProviderHost>
  );

  return (
    <PhiSignalRuntimePartitionProvider
      id={`area:${runtime.site.key}:${runtime.area}`}
      kind="area"
      context={{ siteKey: runtime.site.key, area: runtime.area }}
    >
      <PhiRuntimeModuleProvider
        moduleIds={[...runtimeModuleScope.moduleSet.activeModuleIds]}
        widgetTypes={[...runtimeModuleScope.moduleSet.widgetDefinitionsByType.keys()]}
        layoutTypes={[...runtimeModuleScope.moduleSet.layoutDefinitionsByType.keys()]}
        dataProviderDescriptors={runtime.area === "builder"
          ? [...runtimeModuleScope.moduleSet.dataProviderDescriptorsByKey.values()]
          : []}
        calendarAdapterDescriptors={[
          ...runtimeModuleScope.moduleSet.calendarAdapterDescriptorsByKey.values(),
        ]}
      >
        {runtimeContent}
      </PhiRuntimeModuleProvider>
    </PhiSignalRuntimePartitionProvider>
  );
}
