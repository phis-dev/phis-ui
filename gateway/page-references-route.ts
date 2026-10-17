import { jsonResponse } from "./route-handler-helpers";
import "server-only";

import type { NextRequest } from "next/server";

import { isPhiBuilderAreaKey, isPhiCmsAreaKey } from "../constants/cms-areas";
import { canPhiViewerAccess, PHI_VIEWER_ACCESS_CONTENT_EDITING, PHI_VIEWER_ACCESS_STRUCTURE_AUTHORING } from "../types/access";
import {
  readPhiAreaLandingSelection,
  readPhiAreaPublicRoutePaths,
} from "../helpers/cms-area-config";
import { resolvePhiBuilderActivePageCatalog } from "../helpers/cms-page-catalog";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";
import { buildPhiAreaActivePresetPages } from "../helpers/cms-preset-page-tree";
import { buildPhiBuilderPageReferenceTree } from "../helpers/page-reference-tree";
import { resolveActivePresetModuleKeys } from "../server-helpers/cms-request";
import { getPhiExactSiteArea } from "../server-helpers/cms";
import { loadPhiSiteRequestContext } from "../server-helpers/runtime";
import { getSiteCmsPageCatalog } from "./site-page";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";

/**
 * The Pages of one Area a link may point at, as the tree a picker draws.
 *
 * Answered in the Site because half of it is the Site's: Core knows the Pages it stores, and only the
 * Area's own Module catalog knows which Module Pages the Area answers on today -- a catalog an Editor
 * render does not carry, since each Area's bundle holds only its own Modules. This route reaches the
 * named Area's Bridge, compiles its active routes the way a request does, and merges Core's Pages in the
 * way the Builder's picker does, so both offer the same tree.
 *
 * Everybody who writes for the Site may ask: an Author links a News entry, a Builder a Button. Core
 * repeats the check on the Page list it is asked for.
 */
export function buildPhiPageReferencesRouteHandler({
  loadAreaBridge,
}: {
  loadAreaBridge: PhiSiteAreaBridgeLoader;
}) {
  return async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const area = requestUrl.searchParams.get("area")?.trim().toLowerCase() || "public";
    const locale = requestUrl.searchParams.get("locale")?.trim() || undefined;
    if (!isPhiCmsAreaKey(area) || !isPhiBuilderAreaKey(area)) {
      return jsonResponse({ error: "Unknown Area." }, 400);
    }

    const bridge = await loadAreaBridge(area);
    if (!bridge?.runtime) {
      return jsonResponse({ error: "The Area is not available." }, 404);
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const runtime = bridge.runtime;
    const requestContext = await loadPhiSiteRequestContext(
      runtime.siteKey,
      locale ?? "",
      cookieHeader,
      runtime.apiBaseUrl,
      runtime.internalToken,
    );
    if (
      !canPhiViewerAccess(requestContext.viewer, PHI_VIEWER_ACCESS_CONTENT_EDITING) &&
      !canPhiViewerAccess(requestContext.viewer, PHI_VIEWER_ACCESS_STRUCTURE_AUTHORING)
    ) {
      return jsonResponse({ error: "Not allowed." }, 403);
    }

    try {
      const catalog = resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog);
      const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, area);
      const areaPreset = shellBinding
        ? await getPhiExactSiteArea({
            path: area === "public" ? "/" : `/${area}`,
            apiBaseUrl: runtime.apiBaseUrl,
            internalToken: runtime.internalToken,
            siteKey: runtime.siteKey,
            locale,
            cookieHeader,
            sourcePreset: {
              ownerModuleId: shellBinding.descriptor.ownerModuleId,
              presetKey: shellBinding.descriptor.presetKey,
            },
          })
        : null;
      const activeModuleIds = resolveActivePresetModuleKeys(
        bridge.runtimeModuleCatalog,
        area,
        areaPreset ? { preset: areaPreset.preset } : null,
        requestContext.serverCapabilities,
      );
      const routeTable = compilePhiCmsActiveRouteTable({
        catalog,
        area,
        activeModuleIds,
        publicRoutePaths: readPhiAreaPublicRoutePaths(areaPreset?.preset.preset.config),
        landingSelection: readPhiAreaLandingSelection(areaPreset?.preset.preset.config),
      });
      const persistedPages = await getSiteCmsPageCatalog({
        apiBaseUrl: runtime.apiBaseUrl,
        internalToken: runtime.internalToken,
        siteKey: runtime.siteKey,
        area,
        locale,
        cookieHeader,
      });
      const pages = resolvePhiBuilderActivePageCatalog(
        area,
        { [area]: buildPhiAreaActivePresetPages(routeTable) },
        null,
        { [area]: persistedPages },
      );
      return jsonResponse({ area, options: buildPhiBuilderPageReferenceTree(area, pages, pages) });
    } catch (error) {
      console.warn("[phi-page-references] Page list failed.", { area, error });
      return jsonResponse({ error: "The Page list could not be read." }, 502);
    }
  };
}
