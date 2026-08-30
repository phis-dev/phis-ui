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

const SYNTHETIC_RESET_PASSWORD_REGION_IDS = {
  regionContent: -270,
} as const;

export async function buildPhiDefaultPubResetPasswordPageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  runtime: { phis: { apiBaseUrl: string; internalToken: string } };
}): Promise<PhiResolvedCmsPageTree> {
  const SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent", "layoutForm"]);
  const SYNTHETIC_RESET_PASSWORD_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetDescription", "widgetResetPassword", "widgetResetPasswordSubmit"]);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_RESET_PASSWORD_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutContent,
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
        id: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password page",
        config: {
          maxWidth: 1120,
          gap: PHI_PADDING.lg,
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "form", preset: "panel" },
        typeKey: "form",
        id: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password form layout",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "description",
        id: SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetDescription,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password description widget",
        config: {
          eyebrow: "Reset password",
          title: "Choose a new password",
          description: "Use the reset link from your email to choose a new secure password.",
          asideTitle: "What happens next",
          asideItems: [
            "Open the reset link from your email.",
            "Choose a new password and confirm it.",
            "Sign in again with your updated password.",
          ],
          footer: "If the link expired, request a new reset email from the login page.",
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPassword,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.resetPassword,
          signalRoutes: { listens: [{ routeKey: "pub-reset-password-submit", capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPassword) }] },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "button", id: SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPasswordSubmit,
        siteId: page.siteId, parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm, slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask,
        label: "pub reset password submit", config: { key: "submit", label: "Reset password", buttonType: "primary", signalRoutes: { emits: [{ routeKey: "pub-reset-password-submit-button", capabilityId: "activate", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPassword) }] } }, contentId: null,
      }),
    ],
  };
}
