import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { buildPhiBasePageColumnFrame } from "../../../../components/regions/presets/phi-base-page-column";
import { PHI_LAYOUT } from "../../../../theme/phi-tokens";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { createPhiPageUri } from "../../../../types/references";
import { PHI_PUBLIC_BASE_PAGE_REFERENCES } from "../../public-base-page-references";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";

/**
 * Placeholder privacy page, carried inline for the reason the terms are. It is not a policy and does not
 * pretend to be one: it says that the operator has published none here. The second sentence points at the
 * contact page by reference, so the link follows whichever Module holds that Page.
 */
const PHI_DEFAULT_PUB_PRIVACY_MARKDOWN = `# Privacy

The operator of this website has not published a privacy policy here yet.

If you have questions about how your data is handled, please [contact the operator](${createPhiPageUri(PHI_PUBLIC_BASE_PAGE_REFERENCES.contact)}).
`;

const SYNTHETIC_PRIVACY_REGION_IDS = {
  regionContent: -330,
} as const;

const SYNTHETIC_PRIVACY_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-privacy-page",
}, [
  "layoutContent",
]);

const SYNTHETIC_PRIVACY_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-privacy-page",
}, [
  "widgetMarkdown",
]);

export async function buildPhiDefaultPubPrivacyPageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    // On the base scaffold, in a column on the wash that stops at the reading measure.
    ...buildPhiBasePageColumnFrame({
      page,
      regionId: SYNTHETIC_PRIVACY_REGION_IDS.regionContent,
      columnId: SYNTHETIC_PRIVACY_LAYOUT_IDS.layoutContent,
      label: "pub privacy page",
      maxWidth: PHI_LAYOUT.readingMax,
    }),
    contentWidgets: [
      nodes.widget({
        typeKey: "markdown",
        id: SYNTHETIC_PRIVACY_WIDGET_IDS.widgetMarkdown,
        parentLayoutNodeId: SYNTHETIC_PRIVACY_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub privacy markdown widget",
        config: {
          sourceMode: "inline",
          markdown: PHI_DEFAULT_PUB_PRIVACY_MARKDOWN,
        },
      }),
    ],
  };
}
