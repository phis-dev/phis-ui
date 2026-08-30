import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_PADDING } from "../../../theme/phi-tokens";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import { createPhiSignalAddress } from "../../../types/signals";

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
  "widgetContactSubmit",
]);

export async function buildPhiDefaultPubContactPageTree({
  page,
}: {
  page: PhiCmsPageNode;
  runtime: { phis: { apiBaseUrl: string; internalToken: string } };
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
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "split", preset: "panel" },
        typeKey: "split-card",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub contact page",
        config: {
          maxWidth: 1120,
          gap: PHI_PADDING.lg,
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "form", preset: "panel" },
        typeKey: "form",
        id: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub contact form layout",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "description",
        id: SYNTHETIC_CONTACT_WIDGET_IDS.widgetDescription,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_CONTACT_WIDGET_IDS.widgetContact,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutForm,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub contact widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.contact,
          signalRoutes: { listens: [{ routeKey: "pub-contact-submit", capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_CONTACT_WIDGET_IDS.widgetContact) }] },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "button", id: SYNTHETIC_CONTACT_WIDGET_IDS.widgetContactSubmit,
        siteId: page.siteId, parentLayoutNodeId: SYNTHETIC_CONTACT_LAYOUT_IDS.layoutForm, slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask,
        label: "pub contact submit", config: { key: "submit", label: "Send message", buttonType: "primary", signalRoutes: { emits: [{ routeKey: "pub-contact-submit-button", capabilityId: "activate", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_CONTACT_WIDGET_IDS.widgetContact) }] } }, contentId: null,
      }),
    ],
  };
}
