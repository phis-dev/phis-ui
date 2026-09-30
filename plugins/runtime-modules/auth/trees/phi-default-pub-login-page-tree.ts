import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { PHI_LAYOUT } from "../../../../theme/phi-tokens";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import {
  buildPhiLoginNodes,
  PHI_LOGIN_FORM_LAYOUT_CONFIG,
} from "./phi-login-form-nodes";
import { createPhiAuthControllerAddress } from "../../../../components/runtime/area-base-controller-addresses";

const SYNTHETIC_LOGIN_REGION_IDS = {
  regionContent: -230,
} as const;

export async function buildPhiDefaultPubLoginPageTree({
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
  const SYNTHETIC_LOGIN_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent", "layoutForm"]);
  const SYNTHETIC_LOGIN_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, [
    "widgetDescription",
    "widgetLogin",
    "widgetMethods",
    "widgetStep",
    "widgetProviderLink",
  ]);
  const login = buildPhiLoginNodes({
    ids: SYNTHETIC_LOGIN_WIDGET_IDS,
    siteId: page.siteId,
    visibilityMask: page.visibilityMask,
    parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutForm,
    locale: runtime.locale.current,
    authControllerAddress: createPhiAuthControllerAddress(),
  });
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [
      nodes.region({
        id: SYNTHETIC_LOGIN_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        sortOrder: 30,
      }),
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "split", preset: "panel" },
        typeKey: "split-card",
        id: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub login page",
        config: {
          gap: PHI_SPACE.base,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutForm,
        parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "pub login form layout",
        /*
         * In the middle of its card, which is where the Split Card would have put it.
         *
         * The card anchors what stands in it to the centre on both axes, and this column fills the card
         * -- so the card's anchor has nothing left to place and the column's own has everything. A
         * Flex Vertical starts at the top where nobody says otherwise, which is right for a page's
         * content region and wrong for a sign-in beside a panel of copy: the form then hangs off the top
         * edge of a card as tall as the text next to it. Said here and not in the shared config, because
         * the Overlay's card is exactly as tall as this same column and has no middle to move to.
         */
        config: {
          ...PHI_LOGIN_FORM_LAYOUT_CONFIG,
          padding: 0,
          anchor: { horizontal: "center", vertical: "middle" },
        },
      }),
      ...login.layoutNodes,
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "description",
        id: SYNTHETIC_LOGIN_WIDGET_IDS.widgetDescription,
        parentLayoutNodeId: SYNTHETIC_LOGIN_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
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
      }),
      /*
       * Narrowed on the page alone: the auth overlay builds the same form into a column of its own width.
       *
       * `contentMaxNarrow` is the Theme's measure for exactly this -- a single column of Controls with no
       * label beside them. It stood at 480 for a long time, which is on no scale in this house and, until
       * the Form Widget began passing its block geometry through at all, did nothing whatsoever.
       *
       * Said as the Form's own cap rather than as the block's: this form wears no box, so the two would
       * measure the same thing today, and the moment it wore one the block cap would hand the inset the
       * fields' width instead.
       */
      ...login.contentWidgets.map((widget) =>
        widget.id === SYNTHETIC_LOGIN_WIDGET_IDS.widgetLogin
          ? { ...widget, config: { ...widget.config, maxFormWidth: PHI_LAYOUT.contentMaxNarrow } }
          : widget),
    ],
  };
}
