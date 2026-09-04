import "server-only";

import type { NextRequest } from "next/server";

import {
  isPhiCmsAreaKey,
  resolvePhiCmsAreaMask,
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
import {
  resolveActivePresetModuleKeys,
  resolvePhiCmsRequest,
} from "../server-helpers/cms-request";
import { getPhiCmsPage, getPhiExactSiteArea } from "../server-helpers/cms";
import { resolveCmsRootRoute } from "../server-helpers/cms-route";
import {
  buildPhiBlockRuntime,
  loadPhiSiteRequestContext,
  type PhiSiteRequestContext,
} from "../server-helpers/runtime";
import { runWithPhiRequestRuntime } from "../server-helpers/request-runtime";
import { resolvePhiCmsPageRedirect } from "../components/cms/phi-cms-page-redirect";
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

/**
 * Where a forwarding Area root sends this viewer, so a link can name the destination up front.
 *
 * A client navigation onto a forwarding root races the streamed forward against the Area switch's
 * lazy shell refetches -- measured at dozens of round trips before it settles -- while a link that
 * already names the destination costs one settled navigation. The question can only be answered
 * here: each Area's render bundle deliberately carries only its own Module catalog, and this route
 * is where every Area's bridge is present at once.
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
  const bridgeRuntime = bridge.runtime;
  if (!bridgeRuntime) {
    return null;
  }
  const { siteKey, apiBaseUrl, internalToken } = bridgeRuntime;

  try {
    /*
     * A route handler has no request runtime bound, and a lookup deliberately binds none -- but the
     * helpers under the resolution (translations, locale fetches) read one globally. The scope below
     * gives them a runtime for exactly this unit of work, isolated from everything outside it.
     */
    const scopeRuntime = buildPhiBlockRuntime({
      requestContext,
      areaMask: resolvePhiCmsAreaMask(area),
    });
    const resolved = await runWithPhiRequestRuntime(scopeRuntime, () => resolvePhiCmsRequest({
      siteKey,
      locale,
      area,
      path,
      cookieHeader,
      apiBaseUrl,
      internalToken,
      requestContext,
      runtimeModuleCatalog: bridge.runtimeModuleCatalog,
      purpose: "lookup",
      loadExactCmsArea: (requestPath, sourcePreset) =>
        getPhiExactSiteArea({
          path: requestPath,
          siteKey,
          apiBaseUrl,
          internalToken,
          locale,
          cookieHeader,
          sourcePreset,
        }),
      loadResolvedCmsPage: (requestPath, sourcePreset) =>
        getPhiCmsPage({
          path: requestPath,
          siteKey,
          apiBaseUrl,
          internalToken,
          locale,
          cookieHeader,
          sourcePreset,
        }),
    }));
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

      return json({
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
      return json({ available: false });
    }
  };
}
