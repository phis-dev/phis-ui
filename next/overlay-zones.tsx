import "server-only";

import { isPhiCmsAreaKey } from "../constants/cms-areas";
import { guardPhiCmsAreaAccess } from "../components/cms/phi-cms-area-access-guard";
import { loadPhiCmsAreaRenderScope } from "../components/cms/phi-cms-area-render-scope";
import {
  preparePhiCmsOverlayRenderContext,
  renderPhiCmsOverlayZones,
} from "../components/cms/phi-cms-layout-renderer";
import { isPhiCmsGatewayAuthError } from "../gateway/errors";
import { hasPhiCmsRevisionPreview } from "../server-helpers/cms-root";
import { materializePhiOverlayRuntimeControllerSettings } from "../components/runtime/runtime-controller-materialization";
import { PhiRuntimeControllerServerHost } from "../components/runtime/runtime-controller-server-host";
import { resolvePhiRuntimeControllerDefinitions } from "../plugins/runtime-modules/resolver";
import {
  capturePhiRequestRuntimeStore,
  restorePhiRequestRuntimeStore,
  runInPhiRequestScope,
  type PhiCapturedRequestRuntime,
} from "../server-helpers/request-runtime";
import type { PhiCmsLoadedOverlayZones, PhiCmsOverlayZonesRequest } from "../types/cms-overlay-zones";
import type { PhiSiteAreaBridgeLoader } from "../gateway/site-area-bridges";

function isOverlayZonesRequest(value: unknown): value is PhiCmsOverlayZonesRequest {
  if (typeof value !== "object" || value === null) return false;
  const { area, root, path, overlayId } = value as Record<string, unknown>;
  return isPhiCmsAreaKey(area) &&
    typeof root === "string" && root.length > 0 &&
    (path === null || (Array.isArray(path) && path.every((segment) => typeof segment === "string"))) &&
    typeof overlayId === "string" && overlayId.length > 0;
}

/** Puts the request runtime the Action resolved back in place for the render of what it returned. */
function PhiRestoredRequestRuntime({
  captured,
  children,
}: {
  captured: PhiCapturedRequestRuntime;
  children: React.ReactNode;
}) {
  restorePhiRequestRuntimeStore(captured);
  return children;
}

/**
 * An Area Overlay's zones, rendered for whoever asks -- the body of the Site's Server Action.
 *
 * It renders the same Area the page did, for the viewer this request carries, and answers only for an
 * Overlay that viewer's tree contains: the request comes from a browser and is treated as such. The
 * Area's own access guard runs first, as it does for the page. Anything that does not resolve answers
 * null, and the container says it could not load rather than standing empty.
 *
 * The Site wraps this in a `"use server"` function, because only the Site holds its Area bridges
 * (`src/runtime-modules/overlay-zones.ts`, written by the scaffold).
 */
export async function loadPhiCmsOverlayZones(
  loadBridge: PhiSiteAreaBridgeLoader,
  request: unknown,
): Promise<PhiCmsLoadedOverlayZones | null> {
  return runInPhiRequestScope(() => renderOverlayZones(loadBridge, request));
}

async function renderOverlayZones(
  loadBridge: PhiSiteAreaBridgeLoader,
  request: unknown,
): Promise<PhiCmsLoadedOverlayZones | null> {
  if (!isOverlayZonesRequest(request)) return null;
  const cmsBridge = await loadBridge(request.area);
  if (!cmsBridge) return null;

  let scope: Awaited<ReturnType<typeof loadPhiCmsAreaRenderScope>>;
  try {
    scope = await loadPhiCmsAreaRenderScope({
      root: request.root,
      path: request.path ?? undefined,
      cmsBridge,
    });
  } catch (error) {
    if (isPhiCmsGatewayAuthError(error)) return null;
    throw error;
  }
  const { rootScope, runtime, filteredLayoutTree } = scope;
  if (rootScope.resolvedRoute.area !== request.area || !filteredLayoutTree) return null;

  await guardPhiCmsAreaAccess({
    cmsBridge,
    resolvedRoute: rootScope.resolvedRoute,
    viewer: runtime.viewer,
    pathname: rootScope.request.pathname,
    serverCapabilities: rootScope.requestContext.serverCapabilities,
    isRevisionPreview: hasPhiCmsRevisionPreview(rootScope.request.searchParams),
  });

  const overlay = filteredLayoutTree.overlays.find((candidate) => candidate.id === request.overlayId);
  if (!overlay) return null;
  const context = await preparePhiCmsOverlayRenderContext({
    tree: filteredLayoutTree,
    runtime,
    registry: scope.runtimeRegistry,
    signalScope: "area",
  });
  const zones = renderPhiCmsOverlayZones(context, overlay);
  if (!zones) return null;
  const { runtimeModuleScope } = scope;
  const controllerSettings = materializePhiOverlayRuntimeControllerSettings({
    tree: filteredLayoutTree,
    overlay,
    widgetPluginsByType: runtimeModuleScope.widgetDefinitionsByType,
    activeControllerTypes: [...runtimeModuleScope.moduleSet.controllerDescriptorsByType.keys()],
  });
  const controllers = controllerSettings.length === 0 ? null : (
    <PhiRuntimeControllerServerHost
      controllers={controllerSettings}
      runtime={runtime}
      registry={await resolvePhiRuntimeControllerDefinitions({
        catalog: cmsBridge.runtimeModuleCatalog,
        moduleSet: runtimeModuleScope.moduleSet,
        settings: controllerSettings,
      })}
      controllerModuleIdsByType={runtimeModuleScope.moduleSet.ownerModuleIdByControllerType}
      runtimeModuleCatalog={scope.runtimeRegistry.runtimeModuleCatalog}
    />
  );
  // Next renders the returned nodes after this function has returned, outside the request scope above.
  const captured = capturePhiRequestRuntimeStore();
  const restore = (node: React.ReactNode) => node == null ? null : (
    <PhiRestoredRequestRuntime captured={captured}>{node}</PhiRestoredRequestRuntime>
  );
  return {
    header: restore(zones.header),
    body: restore(zones.body),
    footer: restore(zones.footer),
    controllers: restore(controllers),
  };
}
