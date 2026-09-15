import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";

const SYNTHETIC_RESET_PASSWORD_REGION_IDS = {
  regionContent: -270,
} as const;

export async function buildPhiDefaultPubResetPasswordPageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
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
  }, [
    "widgetDescription",
    "widgetResetPasswordIntro",
    "widgetResetPassword",
    "widgetResetPasswordConfirm",
  ]);
  /*
   * Which of the two stages this visit is: asking for a link, or spending one.
   *
   * The token in the address is the whole of the distinction, and it is settled before anything renders
   * -- so each stage is a placement with a condition on it rather than a branch inside a component that
   * would have to know about both.
   */
  const withoutToken = {
    source: "page",
    valuePath: "query.token",
    operator: "falsy",
  } as const;
  const withToken = {
    source: "page",
    valuePath: "query.token",
    operator: "truthy",
  } as const;
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
          gap: PHI_SPACE.base,
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password form layout",
        config: { padding: 0 },
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
      /*
       * What the sentence above the first stage says, as a Widget of its own: a form describes fields,
       * and this is a note about what happens after you send it.
       */
      buildPhiCmsWidgetNode({
        typeKey: "simple-text",
        id: SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPasswordIntro,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password intro",
        config: {
          text: "If the account exists, a reset email is on its way. Open the link in that email to choose a new password.",
          type: "secondary",
          visibleWhen: withoutToken,
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPassword,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm,
        slotIndex: 1,
        sortOrder: 1,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password request widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.resetPassword,
          submit: {},
          visibleWhen: withoutToken,
        },
        contentId: null,
      }),
      /*
       * The second stage submits the `confirm` phase of the reset, and the token it spends comes from
       * the address it was reached by -- the only place that token exists.
       */
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: SYNTHETIC_RESET_PASSWORD_WIDGET_IDS.widgetResetPasswordConfirm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_RESET_PASSWORD_LAYOUT_IDS.layoutForm,
        slotIndex: 2,
        sortOrder: 2,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub reset password confirm widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.resetPasswordConfirm,
          submit: {},
          execution: { mode: "handler", phase: "confirm" },
          formConfig: { initialValuesFromQuery: { token: "token" } },
          visibleWhen: withToken,
        },
        contentId: null,
      }),
    ],
  };
}
