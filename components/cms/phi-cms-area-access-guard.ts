import "server-only";

import { forbidden, redirect, unauthorized } from "next/navigation";

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { PhiCapabilitySnapshot } from "../../types/server-capabilities";
import type { PhiBlockRuntimeViewer } from "../../types/widget-runtime";
import type { PhiResolvedRootRoute } from "../../server-helpers/cms-route";
import { canPhiViewerAccess } from "../../types/access";
import { resolvePhiCmsDescriptorCatalog } from "../../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiPublicLoginHref } from "../../server-helpers/public-login-route";
import { localizeAreaPath } from "../../helpers/locale";

/**
 * Refuses an Area root the viewer may not enter, and returns only when they may.
 *
 * Asked by the Layout for a document request and by the Page for a client navigation that stayed inside
 * the same branch and never re-ran the Layout. A signed-out visitor is sent to the Public login; anyone
 * else back to the root of the Area they resolve to -- where they may enter it. Where they may not, or
 * it is this very Area, the answer is 403: a forward there would be refused and forwarded again.
 */
export async function guardPhiCmsAreaAccess({
  cmsBridge,
  resolvedRoute,
  viewer,
  pathname,
  serverCapabilities,
  isRevisionPreview,
}: {
  cmsBridge: PhiCmsSiteBridge;
  resolvedRoute: Pick<PhiResolvedRootRoute, "rootKind" | "area" | "locale">;
  viewer: PhiBlockRuntimeViewer;
  pathname: string | null | undefined;
  serverCapabilities: PhiCapabilitySnapshot | null;
  isRevisionPreview: boolean;
}): Promise<void> {
  const areaDefinitions = resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog).areaDefinitions;
  const areaDefinition = areaDefinitions.get(resolvedRoute.area);
  if (
    !isRevisionPreview &&
    resolvedRoute.rootKind === "area" &&
    areaDefinition &&
    !canPhiViewerAccess(viewer, areaDefinition.accessPolicy) &&
    viewer.resolvedArea
  ) {
    if (viewer.access === "public" && resolvedRoute.area !== "public") {
      // Section 6 of AUTHENTICATION.md: where no active Public Auth Module owns the route, protected
      // access fails closed. Assuming it would send the visitor to a 404 that reports a missing page
      // instead of a refused one, and the Layout still runs before the shell flushes, so 401 can
      // still be the status rather than only the body.
      const login = await resolvePhiPublicLoginHref(
        cmsBridge,
        resolvedRoute.locale,
        serverCapabilities,
      );
      if (!login) {
        unauthorized();
      }
      const next = pathname?.trim() || `/${resolvedRoute.area}`;
      redirect(`${login}?${new URLSearchParams({ next }).toString()}`);
    }
    /*
     * Server and UI decide who may enter from the same claims, so the home Area admits its viewer --
     * until they disagree: a claim this side cannot read, an Area switched off. Then the home Area is
     * as closed as this one, and forwarding there is a loop rather than a way out.
     */
    const homeDefinition = areaDefinitions.get(viewer.resolvedArea);
    if (
      viewer.resolvedArea === resolvedRoute.area ||
      !homeDefinition ||
      !canPhiViewerAccess(viewer, homeDefinition.accessPolicy)
    ) {
      forbidden();
    }
    redirect(localizeAreaPath(resolvedRoute.locale, viewer.resolvedArea, "/"));
  }
}
