import { jsonResponse, readPhiInternalRequestPath, splitPhiRequestPath } from "./route-handler-helpers";
import "server-only";

import type { NextRequest } from "next/server";

import {
  isPhiCmsAreaKey,
  type PhiCmsAreaKey,
} from "../constants/cms-areas";
import { canPhiViewerAccess } from "../types/access";
import {
  readPhiAreaLandingSelection,
  readPhiAreaPublicRoutePaths,
} from "../helpers/cms-area-config";
import {
  compilePhiCmsActiveRouteTable,
  normalizePhiCmsRoutePath,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../plugins/runtime-modules/descriptor-compiler";
import { resolveActivePresetModuleKeys } from "../server-helpers/cms-request";
import { resolvePhiCmsLookup } from "../server-helpers/cms-lookup";
import { getPhiCmsPage, getPhiExactSiteArea } from "../server-helpers/cms";
import { resolveCmsRootRoute } from "../server-helpers/cms-route";
import { loadPhiSiteRequestContext } from "../server-helpers/runtime";
import { resolvePhiCmsPageRedirect } from "../components/cms/phi-cms-page-redirect";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";
import type { PhiSiteRequestContext } from "../types/site-request-context";

function resolveAreaStoragePath(path: string, area: PhiCmsAreaKey) {
  if (area === "public") {
    return normalizePhiCmsRoutePath(path);
  }
  const prefix = `/${area}`;
  if (path === prefix) {
    return "/";
  }
  return path.startsWith(`${prefix}/`)
    ? normalizePhiCmsRoutePath(path.slice(prefix.length))
    : null;
}

/**
 * Where a forwarding Area root sends this viewer, so a link can name the destination up front.
 *
 * A client navigation onto a forwarding root races the streamed forward against the Area switch's
 * lazy shell refetches -- measured at dozens of round trips before it settles -- while a link that
 * already names the destination costs one settled navigation. The question can only be answered
 * here: each Area's render bundle deliberately carries only its own Module catalog, and this route can
 * reach any Area's Bridge -- one at a time, the one the request names.
 *
 * The resolution is the request resolution itself -- same routing table, same access checks, same
 * Builder-configured root route -- run as a lookup so it binds no request state. `null` means "link
 * to the root and let it forward": failures, landing-page roots and unresolvable targets all keep
 * the 307 the root already answers for document requests.
 */
async function resolveAreaRootDestinationHref({
  bridge,
  area,
  locale,
  path,
  cookieHeader,
  requestContext,
}: {
  bridge: PhiCmsSiteBridge;
  area: PhiCmsAreaKey;
  locale: string;
  path: string;
  cookieHeader: string;
  requestContext: PhiSiteRequestContext;
}): Promise<string | null> {
  if (!bridge.runtime) {
    return null;
  }

  try {
    const resolved = await resolvePhiCmsLookup({ bridge, area, locale, path, cookieHeader, requestContext });
    if (!resolved) {
      return null;
    }
    return resolvePhiCmsPageRedirect(resolved.page.page, locale)?.href ?? null;
  } catch (error) {
    console.warn("[phi-navigation-target] Root destination resolution failed.", { area, error });
    return null;
  }
}

export function buildPhiNavigationTargetRouteHandler({
  loadAreaBridge,
}: {
  loadAreaBridge: PhiSiteAreaBridgeLoader;
}) {
  return async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const area = requestUrl.searchParams.get("area")?.trim().toLowerCase() ?? "";
    const pathname = readPhiInternalRequestPath(requestUrl.searchParams.get("path"), request.url);

    if (!isPhiCmsAreaKey(area) || !pathname) {
      return jsonResponse({ available: false }, 400);
    }

    const bridge = await loadAreaBridge(area);
    const target = splitPhiRequestPath(pathname);
    if (!bridge?.runtime || !target) {
      return jsonResponse({ available: false });
    }

    try {
      const resolvedRoute = await resolveCmsRootRoute(target.root, target.path, bridge.runtime);
      if (resolvedRoute.area !== area) {
        return jsonResponse({ available: false });
      }

      const cookieHeader = request.headers.get("cookie") ?? "";
      const requestContext = await loadPhiSiteRequestContext(
        bridge.runtime.siteKey,
        resolvedRoute.locale,
        cookieHeader,
        bridge.runtime.apiBaseUrl,
        bridge.runtime.internalToken,
      );
      const catalog = resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog);
      const areaDefinition = catalog.areaDefinitions.get(area);
      const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, area);
      if (
        !areaDefinition ||
        !shellBinding ||
        !canPhiViewerAccess(requestContext.viewer, areaDefinition.accessPolicy)
      ) {
        return jsonResponse({ available: false });
      }

      const sourcePreset = {
        ownerModuleId: shellBinding.descriptor.ownerModuleId,
        presetKey: shellBinding.descriptor.presetKey,
      };
      const areaPreset = await getPhiExactSiteArea({
        path: resolvedRoute.cmsPath,
        apiBaseUrl: bridge.runtime.apiBaseUrl,
        internalToken: bridge.runtime.internalToken,
        siteKey: bridge.runtime.siteKey,
        locale: resolvedRoute.locale,
        cookieHeader,
        sourcePreset,
      });
      const activeModuleIds = resolveActivePresetModuleKeys(
        bridge.runtimeModuleCatalog,
        area,
        areaPreset ? { preset: areaPreset.preset } : null,
        requestContext.serverCapabilities,
      );
      const storagePath = resolveAreaStoragePath(resolvedRoute.cmsPath, area);
      const routeTable = compilePhiCmsActiveRouteTable({
        catalog,
        area,
        activeModuleIds,
        publicRoutePaths: readPhiAreaPublicRoutePaths(areaPreset?.preset.preset.config),
        landingSelection: readPhiAreaLandingSelection(areaPreset?.preset.preset.config),
      });
      const routeBinding = storagePath
        ? resolvePhiCmsRoutePreset(routeTable, storagePath)
        : null;
      const customPage = routeBinding
        ? null
        : await getPhiCmsPage({
            path: resolvedRoute.cmsPath,
            apiBaseUrl: bridge.runtime.apiBaseUrl,
            internalToken: bridge.runtime.internalToken,
            siteKey: bridge.runtime.siteKey,
            locale: resolvedRoute.locale,
            cookieHeader,
          });
      // A Site-authored Page is available because it exists, not because of who is asking.
      const available = routeBinding != null || customPage != null;

      // Only an Area root can forward; for every other path the question does not arise.
      const destinationHref = available && storagePath === "/"
        ? await resolveAreaRootDestinationHref({
            bridge,
            area,
            locale: resolvedRoute.locale,
            path: resolvedRoute.cmsPath,
            cookieHeader,
            requestContext,
          })
        : null;

      return jsonResponse({
        available,
        canonicalHref: resolvedRoute.canonicalHref,
        destinationHref,
      });
    } catch (error) {
      console.warn("[phi-navigation-target] Target resolution failed.", {
        area,
        pathname,
        error,
      });
      return jsonResponse({ available: false });
    }
  };
}
