import { forbidden, notFound, redirect, unauthorized } from "next/navigation";

import { PhiCmsRegionType } from "../../constants/phi-cms";
import type { PhiResolvedCmsAreaPresetTree } from "../../types/cms";
import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import { PhiCmsShell } from "../shell/phi-cms-shell";
import { PhiCmsLayoutRenderer, PhiCmsOverlayRenderer } from "./phi-cms-layout-renderer";
import { hasRenderableRegionRoot } from "./phi-cms-region-helpers";
import { loadPhiCmsAreaRenderScope } from "./phi-cms-area-render-scope";
import { hasPhiCmsRevisionPreview } from "../../server-helpers/cms-root";
import { performPhiCmsPageRedirect, resolvePhiCmsPageRedirect } from "./phi-cms-page-redirect";
import { localizeAreaPath } from "../../helpers/locale";
import {
  resolvePhiPublicLoginHref,
  resolvePhiUnauthenticatedLoginHref,
} from "../../server-helpers/public-login-route";
import { isPhiCmsGatewayAuthError } from "../../gateway/errors";
import { PhiRuntimeControllerServerHost } from "../runtime/runtime-controller-server-host";
import { PhiRuntimeModuleProvider } from "../runtime/runtime-module-context";
import { PhiRuntimeModuleDataProviderHost } from "../runtime/runtime-module-data-provider-host";
import { PhiSignalRuntimePartitionProvider } from "../runtime/runtime-signal-partition";
import { canPhiViewerAccess } from "../../types/access";
import { resolvePhiCmsDescriptorCatalog } from "../../plugins/runtime-modules/descriptor-compiler";

/**
 * How much of the Area a Layout draws.
 *
 * `shell` is the ordinary case. `none` is the root of an Area, which draws the Page-owned Regions and
 * nothing around them: it is either a landing page, whose whole point is to arrive without the Area's
 * chrome and its cost, or a redirect, which draws nothing at all. Because that is decided by which
 * branch of the route tree answers rather than by a condition inside one Layout, a client navigation
 * between the two mounts and unmounts the Shell instead of leaving a stale one standing.
 */
export type PhiCmsAreaChrome = "shell" | "none";

export type PhiCmsAreaBoundaryProps = {
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
};

export type PhiCmsAreaShellProps = {
  root: string;
  cmsBridge: PhiCmsSiteBridge;
  children: React.ReactNode;
  chrome?: PhiCmsAreaChrome;
  path?: string[];
  headerBottom?: React.ReactNode;
  hero?: React.ReactNode;
  siderRight?: React.ReactNode;
  footerTop?: React.ReactNode;
  drawer?: React.ReactNode;
};

export type PhiCmsRootLayoutProps = PhiCmsAreaBoundaryProps & Omit<PhiCmsAreaShellProps, "children">;

function findRegion(tree: PhiResolvedCmsAreaPresetTree, regionType: number) {
  return tree.regions.find((region) => region.regionType === regionType);
}

/**
 * The Area's guards, its providers, and its Overlays.
 *
 * Everything here is true of the Area regardless of which of its Layouts draws the Regions, which is
 * why it sits above them: a client navigation between the root of an Area and a page inside it changes
 * the branch below this one, and remounting the signal partition or the data provider host on that
 * boundary would rebuild state that never changed.
 */
export async function PhiCmsAreaBoundary({
  root,
  cmsBridge,
  children,
  path,
}: PhiCmsAreaBoundaryProps) {
  let scope: Awaited<ReturnType<typeof loadPhiCmsAreaRenderScope>>;
  try {
    scope = await loadPhiCmsAreaRenderScope({ root, path, cmsBridge });
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
  const { rootScope, runtime, runtimeModuleScope, filteredLayoutTree } = scope;
  const { resolvedRoute, request } = rootScope;
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

  /*
   * A forwarding Page is answered here for the same reason, and it matters more.
   *
   * A redirect decided in the Page arrives after the shell has flushed, so Next can only put a
   * client-side redirect into a 200 -- which a browser follows and a crawler files as a page. An Area
   * root that forwards is exactly the case that must not be indexed as a page, so the status line has
   * to say 307. The Page keeps its own copy of this for the client navigation that never re-runs this
   * Layout.
   */
  if (!path && rootScope.resolvedRequest) {
    const pageRedirect = resolvePhiCmsPageRedirect(
      rootScope.resolvedRequest.page.page,
      resolvedRoute.locale,
      request.pathname,
    );
    /*
     * Never onto the path the request already names.
     *
     * This Layout is above the branch split and receives no catch-all segments of its own, so which
     * Page it resolved is derived rather than given. Derived can be wrong -- a partial re-render that
     * does not carry the request path resolves the Area root instead of the Page below it -- and a
     * forward to where the browser already is does not fail, it repeats: the client applies it, asks
     * again, and the same answer comes back. The Page keeps its own copy of this decision and is given
     * its segments, so what is skipped here is only ever a forward that was already satisfied.
     */
    if (pageRedirect) {
      performPhiCmsPageRedirect(pageRedirect);
    }
  }

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
        <PhiRuntimeModuleDataProviderHost
          providerKeys={[...scope.runtimeRegistry.dataProviderDescriptorsByKey.keys()]}
        >
          {scope.registeredControllerSettings && scope.registeredControllerSettings.length > 0 ? (
            <PhiRuntimeControllerServerHost
              controllers={scope.registeredControllerSettings}
              runtime={runtime}
              registry={scope.controllerDefinitionsByType}
              controllerModuleIdsByType={runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
              runtimeModuleCatalog={scope.runtimeRegistry.runtimeModuleCatalog}
            />
          ) : null}
          {children}
          {filteredLayoutTree ? (
            <PhiCmsOverlayRenderer
              tree={filteredLayoutTree}
              runtime={runtime}
              registry={scope.runtimeRegistry}
              signalScope="area"
            />
          ) : null}
        </PhiRuntimeModuleDataProviderHost>
      </PhiRuntimeModuleProvider>
    </PhiSignalRuntimePartitionProvider>
  );
}

/**
 * The Area-owned Regions around a Page, or nothing but the grid they share.
 *
 * With `chrome: "none"` the five Area-owned Regions are not drawn and not resolved -- their Widgets,
 * their chunks and the Navigation surfaces they carry never enter the response. The Page-owned slots
 * still render, because a landing page is a page like any other.
 *
 * It refuses nothing: a gated Area throws inside the boundary above, which answers 401 or 403 while
 * this returns the Page bare rather than racing it to a different error.
 */
export async function PhiCmsAreaShell({
  root,
  cmsBridge,
  children,
  chrome = "shell",
  path,
  headerBottom,
  hero,
  siderRight,
  footerTop,
  drawer,
}: PhiCmsAreaShellProps) {
  const slots = { headerBottom, hero, siderRight, footerTop, drawer };

  if (chrome === "none") {
    return <PhiCmsShell content={children} {...slots} />;
  }

  let scope: Awaited<ReturnType<typeof loadPhiCmsAreaRenderScope>>;
  try {
    scope = await loadPhiCmsAreaRenderScope({ root, path, cmsBridge });
  } catch (error) {
    if (isPhiCmsGatewayAuthError(error)) {
      return <PhiCmsShell content={children} {...slots} />;
    }
    throw error;
  }
  const { runtime, filteredLayoutTree, runtimeRegistry } = scope;

  const headerTopRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.HeaderTop) : null;
  const headerMainRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.HeaderMain) : null;
  const siderLeftRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.SiderLeft) : null;
  const footerMainRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.Footer) : null;
  const footerBottomRegion = filteredLayoutTree ? findRegion(filteredLayoutTree, PhiCmsRegionType.FooterBottom) : null;
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

  return (
    <PhiCmsShell
      content={children}
      headerTop={hasRenderableHeaderTop ? (
        <PhiCmsLayoutRenderer
          tree={filteredLayoutTree!}
          runtime={runtime}
          regionClassName="phi-shell-region header_top"
          regionTypes={[PhiCmsRegionType.HeaderTop]}
          registry={runtimeRegistry}
        />
      ) : undefined}
      headerMain={hasRenderableHeaderMain ? (
        <PhiCmsLayoutRenderer
          tree={filteredLayoutTree!}
          runtime={runtime}
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
          runtime={runtime}
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
          runtime={runtime}
          regionClassName="phi-shell-region footer_main"
          regionTypes={[PhiCmsRegionType.Footer]}
          registry={runtimeRegistry}
        />
      ) : undefined}
      footerBottom={hasRenderableFooterBottom ? (
        <PhiCmsLayoutRenderer
          tree={filteredLayoutTree!}
          runtime={runtime}
          regionClassName="phi-shell-region footer_bottom"
          regionTypes={[PhiCmsRegionType.FooterBottom]}
          registry={runtimeRegistry}
        />
      ) : undefined}
    />
  );
}

/**
 * Boundary and Shell in one component, for a caller that is not a pair of Layouts.
 *
 * The root error routes are the case: they run above every Area Layout, so there is no branch left to
 * split across and they rebuild the whole Area themselves.
 */
export async function PhiCmsRootLayout({
  root,
  cmsBridge,
  children,
  path,
  chrome,
  headerBottom,
  hero,
  siderRight,
  footerTop,
  drawer,
}: PhiCmsRootLayoutProps) {
  return (
    <PhiCmsAreaBoundary root={root} cmsBridge={cmsBridge} path={path}>
      <PhiCmsAreaShell
        root={root}
        cmsBridge={cmsBridge}
        chrome={chrome}
        path={path}
        headerBottom={headerBottom}
        hero={hero}
        siderRight={siderRight}
        footerTop={footerTop}
        drawer={drawer}
      >
        {children}
      </PhiCmsAreaShell>
    </PhiCmsAreaBoundary>
  );
}
