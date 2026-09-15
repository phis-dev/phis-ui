import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import { localizeAreaPath } from "../../../helpers/locale";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_PADDING } from "../../../theme/phi-tokens";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";

const SYNTHETIC_REGISTER_REGION_IDS = {
  regionContent: -200,
} as const;

export async function buildPhiDefaultPubRegistrationPageTree({
  page,
  presetKey,
  runtime,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  runtime: {
    locale: { current: string };
  };
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
  }, ["widgetDescription", "widgetRegistration", "widgetRegistrationNotice"]);
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
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutForm,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration form layout",
        config: { padding: PHI_SPACE.xl },
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
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration widget",
        /*
         * No submit Widget beside it: the Form Widget carries the submit, in the column its inputs
         * stand in. Unnamed, so the Registration's own label set says what it says -- including the
         * word it changes to while an account is being created.
         */
        config: {
          formId: PHI_SHARED_FORM_IDS.registration,
          submit: {},
          formConfig: {
            // Localized here, where the locale is known: the consent link is a path on this Site.
            termsHref: localizeAreaPath(runtime.locale.current, "public", "/terms-and-conditions"),
          },
        },
        contentId: null,
      }),
      /*
       * The small print stands beside the form, not in it: a form describes fields, and this is a
       * sentence about what happens next. A Widget in the next slot is what composition looks like.
       */
      buildPhiCmsWidgetNode({
        typeKey: "simple-text",
        id: SYNTHETIC_REGISTER_WIDGET_IDS.widgetRegistrationNotice,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_REGISTER_LAYOUT_IDS.layoutForm,
        slotIndex: 1,
        sortOrder: 1,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub registration notice",
        config: {
          text: "We only use your details to create and support your account.",
          type: "secondary",
        },
        contentId: null,
      }),
    ],
  };
}
