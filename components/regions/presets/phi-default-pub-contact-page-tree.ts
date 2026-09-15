import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";

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
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_CONTACT_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {},
      },
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "split", preset: "panel" },
        typeKey: "split-card",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: "pub contact page",
        config: {
          gap: PHI_SPACE.base,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutForm,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "pub contact form layout",
        config: { padding: 0 },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "description",
        id: SYNTHETIC_CONTACT_WIDGET_IDS.widgetDescription,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: "pub contact description widget",
        config: {
          eyebrow: "Contact",
          title: "Get in touch",
          description: "Send us your question, project request, or product inquiry and we will get back to you.",
          asideTitle: "How we can help",
          asideItems: [
            "General questions about products and services.",
            "Project requests and technical clarifications.",
            "Follow-up on existing customer inquiries.",
          ],
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
          submit: {},
        },
      }),
    ],
  };
}
