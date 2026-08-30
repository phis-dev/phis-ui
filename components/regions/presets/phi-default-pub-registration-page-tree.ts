import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
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

const SYNTHETIC_REGISTER_REGION_IDS = {
  regionContent: -200,
} as const;

export async function buildPhiDefaultPubRegistrationPageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  runtime: { phis: { apiBaseUrl: string; internalToken: string } };
}): Promise<PhiResolvedCmsPageTree> {
  const SYNTHETIC_REGISTER_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent", "layoutForm"]);
  const SYNTHETIC_REGISTER_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetDescription", "widgetRegistration", "widgetRegistrationSubmit"]);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_REGISTER_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutContent,
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
        id: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration page",
        config: {
          maxWidth: 1120,
          gap: PHI_PADDING.lg,
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "form", preset: "panel" },
        typeKey: "form",
        id: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration form layout",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "description",
        id: SYNTHETIC_REGISTER_WIDGET_IDS.widgetDescription,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration description widget",
        config: {
          eyebrow: "Register",
          title: "Create account",
          description: "Create your account to access your personalized workspace.",
          asideTitle: "Benefits",
          asideItems: [
            "Manage orders and account details.",
            "Confirm your email to activate access.",
            "Receive optional updates and product news.",
          ],
          footer: "Complete the form and confirm the link in your email to finish registration.",
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_REGISTER_WIDGET_IDS.widgetRegistration,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutForm,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.registration,
          formConfig: {
            termsHref: "/terms-and-conditions",
          },
          signalRoutes: { listens: [{ routeKey: "pub-registration-submit", capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_REGISTER_WIDGET_IDS.widgetRegistration) }] },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "button", id: SYNTHETIC_REGISTER_WIDGET_IDS.widgetRegistrationSubmit,
        siteId: page.siteId, parentLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutForm, slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask,
        label: "pub registration submit", config: { key: "submit", label: "Create account", buttonType: "primary", signalRoutes: { emits: [{ routeKey: "pub-registration-submit-button", capabilityId: "activate", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_REGISTER_WIDGET_IDS.widgetRegistration) }] } }, contentId: null,
      }),
    ],
  };
}
