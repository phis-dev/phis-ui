import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

/**
 * Placeholder terms, carried inline. The page used to fetch `/terms-and-conditions.md` from the Site's
 * `public/` directory, which a fresh Site had to be given first; inline copy needs nothing, and the
 * Markdown Widget persists it through its content binding the moment the Site takes the page over.
 * They are placeholders and say so: the first thing an operator does is replace them.
 */
const PHI_DEFAULT_PUB_TERMS_MARKDOWN = `# Terms and Conditions

This software is provided as is, without any express or implied warranty.

By using this site, you agree that the operators may change, suspend, or remove features at any time without prior notice.

You are responsible for the accuracy of the information you submit and for keeping your account credentials secure.

You must not use this service for unlawful activity, abuse, or attempts to interfere with the operation of the platform.

To the maximum extent permitted by law, the operators are not liable for any direct, indirect, incidental, or consequential damages arising from the use of this software.

If you do not agree to these terms, do not use this site.
`;

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
        id: SYNTHETIC_TERMS_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_TERMS_LAYOUT_IDS.layoutContent,
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
        id: SYNTHETIC_TERMS_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub terms and conditions page",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "markdown",
        id: SYNTHETIC_TERMS_WIDGET_IDS.widgetMarkdown,
        parentLayoutNodeId: SYNTHETIC_TERMS_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub terms and conditions markdown widget",
        config: {
          sourceMode: "inline",
          markdown: PHI_DEFAULT_PUB_TERMS_MARKDOWN,
          translate: true,
        },
      }),
    ],
  };
}
