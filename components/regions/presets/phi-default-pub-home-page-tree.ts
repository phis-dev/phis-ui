import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

/**
 * Placeholder copy, carried inline for the reason the terms are: a Module cannot put a file into the
 * Site's `public/` directory, and the Markdown Widget persists inline copy the moment the Site takes the
 * page over. It is a placeholder and says so.
 */
const PHI_DEFAULT_PUB_HOME_MARKDOWN = `# Home

This is the Site's home page, inside the frame every Public page wears.

The front door at the root leads here. Take this page over in the Builder to say what the Site is about.
`;

const SYNTHETIC_HOME_REGION_IDS = {
  regionContent: -310,
} as const;

const SYNTHETIC_HOME_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-home-page",
}, [
  "layoutContent",
]);

const SYNTHETIC_HOME_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-home-page",
}, [
  "widgetMarkdown",
]);

/**
 * The Public home page: where the front door at the root leads.
 *
 * The root is a landing and is drawn without the Area Shell; this page is an ordinary Public page, so a
 * visitor who reads on finds the Site's header, navigation and footer around the content.
 */
export async function buildPhiDefaultPubHomePageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_HOME_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_HOME_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {},
      },
    ],
    layoutNodes: [
      nodes.layout({
        typeKey: "content",
        id: SYNTHETIC_HOME_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub home page",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "markdown",
        id: SYNTHETIC_HOME_WIDGET_IDS.widgetMarkdown,
        parentLayoutNodeId: SYNTHETIC_HOME_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub home markdown widget",
        config: {
          sourceMode: "inline",
          markdown: PHI_DEFAULT_PUB_HOME_MARKDOWN,
          translate: true,
        },
      }),
    ],
  };
}
