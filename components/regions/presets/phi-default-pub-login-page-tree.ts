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

const SYNTHETIC_LOGIN_REGION_IDS = {
  regionContent: -230,
} as const;

export async function buildPhiDefaultPubLoginPageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  runtime: { phis: { apiBaseUrl: string; internalToken: string } };
}): Promise<PhiResolvedCmsPageTree> {
  const SYNTHETIC_LOGIN_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent", "layoutForm"]);
  const SYNTHETIC_LOGIN_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetDescription", "widgetLogin", "widgetLoginSubmit"]);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_LOGIN_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
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
        id: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub login page",
        config: {
          maxWidth: 1120,
          gap: PHI_PADDING.lg,
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "form", preset: "panel" },
        typeKey: "form",
        id: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub login form layout",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "description",
        id: SYNTHETIC_LOGIN_WIDGET_IDS.widgetDescription,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub login description widget",
        config: {
          eyebrow: "Login",
          title: "Sign in to your account",
          description: "Access your customer workspace, orders, and account details.",
          asideTitle: "What you can do",
          asideItems: [
            "Review orders and customer details.",
            "Continue to the page you originally requested.",
            "Reset your password if you no longer have access.",
          ],
          footer: "Use the secure sign-in form to continue to your account area.",
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_LOGIN_WIDGET_IDS.widgetLogin,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutForm,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub login widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.login,
          signalRoutes: { listens: [{
            routeKey: "pub-login-submit",
            capabilityId: "submit",
            scope: "page",
            channel: "submit",
            action: "activate",
            valueType: "none",
            receiver: createPhiSignalAddress("cms", SYNTHETIC_LOGIN_WIDGET_IDS.widgetLogin),
          }] },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "button",
        id: SYNTHETIC_LOGIN_WIDGET_IDS.widgetLoginSubmit,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutForm,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub login submit",
        config: {
          key: "submit",
          label: "Sign in",
          buttonType: "primary",
          signalRoutes: { emits: [{ routeKey: "pub-login-submit-button", capabilityId: "activate", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", SYNTHETIC_LOGIN_WIDGET_IDS.widgetLogin) }] },
        },
        contentId: null,
      }),
    ],
  };
}
