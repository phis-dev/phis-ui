import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
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
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";

const SYNTHETIC_CONFIRM_REGION_IDS = {
  regionContent: -210,
} as const;

export async function buildPhiDefaultPubConfirmPageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
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
  }, [
    "widgetDescription",
    "widgetConfirmPreview",
    "widgetConfirm",
    "widgetConfirmMissingToken",
  ]);
  const previewAddress = createPhiSignalAddress(
    "cms",
    SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirmPreview,
  );
  /*
   * The form appears once the preview says the link is still worth spending.
   *
   * Until then there is nothing to confirm -- an expired or spent link would otherwise show a button
   * that can only fail -- and the preview beside it says why in its own words.
   */
  const previewIsPending = {
    source: "widget",
    widgetAddress: previewAddress,
    valuePath: "status",
    operator: "equals",
    value: "pending",
  } as const;
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
      nodes.layout({
        creationPreset: { layoutKind: "split", preset: "panel" },
        typeKey: "split-card",
        id: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub confirmation page",
        config: {
          gap: PHI_SPACE.base,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "pub confirmation form layout",
        config: { padding: 0 },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "description",
        id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetDescription,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
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
      }),
      /*
       * What the link is about, read before anything is confirmed. It reports what it found, and the
       * form beside it appears or stays away on that word.
       */
      nodes.widget({
        typeKey: "form-preview",
        id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirmPreview,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm,
        slotIndex: 0,
        label: "pub confirmation preview",
        config: {
          formId: PHI_SHARED_FORM_IDS.confirm,
          tokenParam: "token",
          // Without a token there is nothing to preview, and the request already says whether there is one.
          visibleWhen: withToken,
          signalRoutes: {
            emits: [{
              routeKey: "pub-confirm-preview-state",
              capabilityId: "conditionStateChange",
              scope: "page",
              channel: "condition",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
              receiver: createPhiSignalAddress("cms", SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirm),
            }],
          },
        },
      }),
      nodes.widget({
        typeKey: "form",
        id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirm,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm,
        slotIndex: 1,
        label: "pub confirmation widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.confirm,
          submit: {},
          formConfig: { initialValuesFromQuery: { token: "token" } },
          visibleWhen: previewIsPending,
        },
      }),
      nodes.widget({
        typeKey: "simple-text",
        id: SYNTHETIC_CONFIRM_WIDGET_IDS.widgetConfirmMissingToken,
        parentLayoutNodeId: SYNTHETIC_CONFIRM_LAYOUT_IDS.layoutForm,
        slotIndex: 2,
        label: "pub confirmation missing token",
        config: {
          text: "No confirmation token was provided. Open the confirmation link from your email.",
          type: "secondary",
          visibleWhen: withoutToken,
        },
      }),
    ],
  };
}
