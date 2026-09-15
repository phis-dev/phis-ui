import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import {
  buildPhiLoginNodes,
  PHI_LOGIN_FORM_LAYOUT_CONFIG,
} from "./phi-login-form-nodes";
import { createPhiAuthControllerAddress } from "../../runtime/area-base-controller-addresses";

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
        config: { ...PHI_LOGIN_FORM_LAYOUT_CONFIG, padding: 0 },
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
      // Narrowed on the page alone: the auth overlay builds the same form into a column of its own width.
      ...login.contentWidgets.map((widget) =>
        widget.id === SYNTHETIC_LOGIN_WIDGET_IDS.widgetLogin
          ? { ...widget, config: { ...widget.config, maxSize: { width: 480 } } }
          : widget),
    ],
  };
}
