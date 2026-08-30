import "server-only";

import type { NextRequest } from "next/server";

import {
  isPhiCmsAreaKey,
  type PhiCmsAreaKey,
} from "../constants/cms-areas";
import { canPhiViewerAccess } from "../types/access";
import {
  compilePhiCmsActiveRouteTable,
  normalizePhiCmsRoutePath,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../plugins/runtime-modules/descriptor-compiler";
import { resolveActivePresetModuleKeys } from "../server-helpers/cms-request";
import { getPhiCmsPage, getPhiExactSiteArea } from "../server-helpers/cms";
import { resolveCmsRootRoute } from "../server-helpers/cms-route";
import { loadPhiSiteRequestContext } from "../server-helpers/runtime";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";

export type PhiNavigationTargetBridges = Partial<
  Readonly<Record<PhiCmsAreaKey, PhiCmsSiteBridge>>
>;

function readInternalPath(value: string | null, requestUrl: string) {
  const normalized = value?.trim() ?? "";
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }

  try {
    return new URL(normalized, requestUrl).pathname;
  } catch {
    return null;
  }
}

function splitTargetPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const [root, ...path] = segments;
  return root ? { root, path } : null;
}

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

function json(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function buildPhiNavigationTargetRouteHandler({
  bridgesByArea,
}: {
  bridgesByArea: PhiNavigationTargetBridges;
}) {
  return async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const area = requestUrl.searchParams.get("area")?.trim().toLowerCase() ?? "";
    const pathname = readInternalPath(requestUrl.searchParams.get("path"), request.url);

    if (!isPhiCmsAreaKey(area) || !pathname) {
      return json({ available: false }, 400);
    }

    const bridge = bridgesByArea[area];
    const target = splitTargetPath(pathname);
    if (!bridge?.runtime || !target) {
      return json({ available: false });
    }

    try {
      const resolvedRoute = await resolveCmsRootRoute(target.root, target.path, bridge.runtime);
      if (resolvedRoute.area !== area) {
        return json({ available: false });
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
        return json({ available: false });
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
        requestContext.viewer,
      );
      const storagePath = resolveAreaStoragePath(resolvedRoute.cmsPath, area);
      const routeTable = compilePhiCmsActiveRouteTable({
        catalog,
        area,
        activeModuleIds,
        viewer: requestContext.viewer,
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
      const available = routeBinding != null || (
        customPage != null &&
        canPhiViewerAccess(requestContext.viewer, customPage.page.page.accessPolicy)
      );

      return json({
        available,
        canonicalHref: resolvedRoute.canonicalHref,
      });
    } catch (error) {
      console.warn("[phi-navigation-target] Target resolution failed.", {
        area,
        pathname,
        error,
      });
      return json({ available: false });
    }
  };
}
