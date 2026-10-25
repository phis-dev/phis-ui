import { PHI_TEXT_SOURCE_PRESET } from "../../../../helpers/text-source";
import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import { PHI_SHARED_FORM_IDS } from "../../../../components/forms/shared-form-ids";
import { PHI_SURFACE_CARD } from "../../../../helpers/surface-presets";

const SYNTHETIC_CONTACT_REGION_IDS = {
  regionContent: -250,
} as const;

const SYNTHETIC_CONTACT_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-contact-page",
}, [
  "layoutContent",
  "layoutForm",
  "layoutAside",
]);

const SYNTHETIC_CONTACT_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-contact-page",
}, [
  "widgetDescription",
  "widgetContact",
]);

export async function buildPhiDefaultPubContactPageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_CONTACT_REGION_IDS.regionContent });
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [
      // The base scaffold every module Page stands on; it carries the page's padding, the card its own.
      scaffold.layoutNode,
      nodes.layout({
        creationPreset: { layoutKind: "split", preset: "panel" },
        typeKey: "split-card",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: "pub contact page",
        // The inset of the cards; a Split Card has none of its own.
        config: { padding: PHI_SPACE.base },
      }),
      nodes.layout({
        typeKey: "flex-vertical",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutAside,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: "pub contact aside layout",
      }),
      nodes.layout({
        typeKey: "flex-vertical",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutForm,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "pub contact form layout",
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "description",
        id: SYNTHETIC_CONTACT_WIDGET_IDS.widgetDescription,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutAside,
        slotIndex: 0,
        sortOrder: 0,
        label: "pub contact description widget",
        config: {
          textSource: PHI_TEXT_SOURCE_PRESET,
          eyebrow: "Contact",
          title: "Get in touch",
          description: "Send us your question, project request, or product inquiry and we will get back to you.",
          asideTitle: "How we can help",
          asideItems: [
            { text: "General questions about products and services." },
            { text: "Project requests and technical clarifications." },
            { text: "Follow-up on existing customer inquiries." },
          ],
          asideList: { itemSurface: PHI_SURFACE_CARD },
          footer: "Use the contact form to send your message directly to our team.",
        },
      }),
      nodes.widget({
        typeKey: "form",
        id: SYNTHETIC_CONTACT_WIDGET_IDS.widgetContact,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutForm,
        slotIndex: 0,
        label: "pub contact widget",
        /*
         * No submit Widget beside it: the Form Widget carries the submit, in the column its inputs
         * stand in. Unnamed, so the Contact form's own label set says what it says, in the language
         * it is read in.
         */
        config: {
          formId: PHI_SHARED_FORM_IDS.contact,
          submit: "inline",
          submitOnEnter: true,
        },
      }),
    ],
  };
}
