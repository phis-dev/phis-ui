import { PhiCmsRegionType } from "../../constants/phi-cms";
import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import type { PhiBlockRuntime } from "../../types";
import { PhiCmsLayoutRenderer } from "./phi-cms-layout-renderer";
import { hasRenderableRegionRoot } from "./phi-cms-region-helpers";
import { loadPhiCmsRootRequest } from "../../server-helpers/cms-root";
import { resolvePhiCmsPageRedirect } from "./phi-cms-page-redirect";
import { isPhiCmsGatewayAuthError } from "../../gateway/errors";
import { PhiCmsPageRuntimeHosts, resolvePhiCmsPageRenderScope } from "./phi-cms-page-render-scope";

export type PhiCmsRootSlotPageProps = {
  root: string;
  path?: string[];
  cmsBridge: PhiCmsSiteBridge;
  regionType: number;
};

function findRenderableRegion(tree: PhiResolvedCmsRenderableTree, regionType: number) {
  return tree.regions.find((region) => region.regionType === regionType);
}

function resolveSlotClassName(regionType: number) {
  switch (regionType) {
    case PhiCmsRegionType.HeaderBottom:
      return "phi-shell-region header_bottom";
    case PhiCmsRegionType.Hero:
      return "phi-shell-region hero";
    case PhiCmsRegionType.SiderRight:
      return "sider_right";
    case PhiCmsRegionType.FooterTop:
      return "phi-shell-region footer_top";
    default:
      return undefined;
  }
}

function resolveSlotStackGap(regionType: number) {
  return regionType === PhiCmsRegionType.SiderRight ? 0 : undefined;
}

export async function PhiCmsRootSlotPage({
  root,
  path,
  cmsBridge,
  regionType,
}: PhiCmsRootSlotPageProps) {
  let rootRequest: Awaited<ReturnType<typeof loadPhiCmsRootRequest>>;
  try {
    rootRequest = await loadPhiCmsRootRequest({
      root,
      path,
      cmsBridge,
    });
  } catch (error) {
    /*
     * A slot refuses nothing, for the same reason it forwards nothing (below).
     *
     * The Layout beside it resolves the same request and answers `401` or `403` there, once, with a
     * status line. Raising it here as well would raise it seven times over -- and a refusal raised from
     * a parallel slot is worse than a repeat: `redirect`, `unauthorized` and `forbidden` all reach the
     * client as a navigation, and a navigation asked for by a slot is asked for again the moment the
     * arriving tree renders that slot again.
     *
     * So an Area the viewer may not see draws no Region here and is refused above.
     */
    if (isPhiCmsGatewayAuthError(error)) {
      return null;
    }
    throw error;
  }
  const { request, resolvedRequest } = rootRequest;

  if (!resolvedRequest) {
    return null;
  }

  /*
   * A slot renders nothing for a forwarding Page, and does not forward itself.
   *
   * Five slots and the Page render in parallel beside this one, so a forward raised here is the same
   * forward raised seven times. The Layout above owns the decision, answers it once with a status
   * line, and a slot that repeats it only multiplies what the client has to unwind.
   */
  const pageRedirect = resolvePhiCmsPageRedirect(
    resolvedRequest.page.page,
    resolvedRequest.runtime.locale.current,
    request.pathname,
  );
  if (pageRedirect) {
    return null;
  }

  const region = findRenderableRegion(resolvedRequest.page, regionType);
  if (!region || !hasRenderableRegionRoot(resolvedRequest.page, region.rootLayoutNodeId)) {
    return null;
  }

  const scope = await resolvePhiCmsPageRenderScope({ cmsBridge, resolvedRequest, regionTypes: [regionType] });
  const filteredRegion = findRenderableRegion(scope.filteredPageTree, regionType);
  if (
    !filteredRegion ||
    !hasRenderableRegionRoot(scope.filteredPageTree, filteredRegion.rootLayoutNodeId)
  ) {
    return null;
  }

  return (
    <PhiCmsPageRuntimeHosts scope={scope} runtime={resolvedRequest.runtime as PhiBlockRuntime}>
      <PhiCmsLayoutRenderer
        tree={scope.filteredPageTree}
        runtime={resolvedRequest.runtime as PhiBlockRuntime}
        regionClassName={resolveSlotClassName(regionType)}
        regionTypes={[regionType]}
        stackGap={resolveSlotStackGap(regionType)}
        registry={scope.runtimeRegistry}
      />
    </PhiCmsPageRuntimeHosts>
  );
}
