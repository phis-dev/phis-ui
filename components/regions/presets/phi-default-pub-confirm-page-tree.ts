import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import {
  PhiCmsPageType,
  PhiCmsRegionType,
  PhiCmsStatus,
} from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_PADDING } from "../../../theme/phi-tokens";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import { createPhiSignalAddress } from "../../../types/signals";

const SYNTHETIC_CONFIRM_REGION_IDS = {
  regionContent: -210,
} as const;

export async function buildPhiDefaultPubConfirmPageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  runtime: { phis: { apiBaseUrl: string; internalToken: string } };
}): Promise<PhiResolvedCmsPageTree> {
  const SYNTHETIC_CONFIRM_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent", "layoutForm"]);
  const SYNTHETIC_CONFIRM_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetDescription", "widgetConfirm", "widgetConfirmSubmit"]);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_CONFIRM_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
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
        id: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub confirmation page",
        config: {
          maxWidth: 1120,
          gap: PHI_PADDING.lg,
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "form", preset: "panel" },
        typeKey: "form",
        id: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub confirmation form layout",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "description",
        id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetDescription,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub confirmation description widget",
        config: {
          eyebrow: "Confirm Email",
          title: "Activate your account",
          description: "Review your registration details and confirm your email address to activate access.",
          asideTitle: "What happens next",
          asideItems: [
            "Your email address is verified.",
            "Your customer account is activated.",
            "You can then sign in with your chosen password.",
          ],
          footer: "If the link is no longer valid, return to registration and request a new verification email.",
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub confirmation widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.confirm,
          formConfig: {
            backHref: "/register",
          },
          signalRoutes: { listens: [{ routeKey: "pub-confirm-submit", capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirm) }] },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "button", id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirmSubmit,
        siteId: page.siteId, parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm, slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask,
        label: "pub confirmation submit", config: { key: "submit", label: "Confirm", buttonType: "primary", signalRoutes: { emits: [{ routeKey: "pub-confirm-submit-button", capabilityId: "activate", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirm) }] } }, contentId: null,
      }),
    ],
  };
}
