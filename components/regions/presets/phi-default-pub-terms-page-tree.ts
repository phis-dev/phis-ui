import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

const SYNTHETIC_TERMS_REGION_IDS = {
  regionContent: -320,
} as const;

const SYNTHETIC_TERMS_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-terms-page",
}, [
  "layoutContent",
]);

const SYNTHETIC_TERMS_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-terms-page",
}, [
  "widgetMarkdown",
]);

export async function buildPhiDefaultPubTermsPageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_TERMS_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_TERMS_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1120 },
          margin: "0 auto",
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        typeKey: "content",
        id: SYNTHETIC_TERMS_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub terms and conditions page",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "markdown",
        id: SYNTHETIC_TERMS_WIDGET_IDS.widgetMarkdown,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_TERMS_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub terms and conditions markdown widget",
        config: {
          sourceUrl: "/terms-and-conditions.md",
          translate: true,
        },
        contentId: null,
      }),
    ],
  };
}
