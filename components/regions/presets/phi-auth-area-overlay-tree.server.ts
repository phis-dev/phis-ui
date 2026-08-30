import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsStatus } from "../../../constants/phi-cms";
import { localizeAreaPath } from "../../../helpers/locale";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import { getPhiLoginFormLabels } from "../../widgets/label-sets/account";
import { createPhiAuthControllerAddress } from "../../runtime/area-base-controller-addresses";
import {
  PHI_AUTH_LOGIN_OVERLAY_IDS,
  type PhiAuthLoginOverlayArea,
} from "../../runtime/auth-overlay-ids";

export async function buildPhiAuthAreaLoginOverlayTree({
  page,
  runtime,
  area,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  area: PhiAuthLoginOverlayArea;
}): Promise<PhiResolvedCmsPageTree> {
  const ids = PHI_AUTH_LOGIN_OVERLAY_IDS[area];
  const labels = await getPhiLoginFormLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return {
    page,
    regions: [],
    overlays: [{
      id: ids.overlayLogin,
      overlayType: "modal",
      headerLayoutNodeId: null,
      bodyLayoutNodeId: ids.layoutBody,
      footerPresentation: "none",
      footerLayoutNodeId: null,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 0,
      label: `${area} auth login`,
      config: {
        title: labels.title ?? "Login",
        controlSize: "medium",
        width: { compact: "calc(100vw - 32px)", medium: 480, wide: 520 },
        mountPolicy: "keep-alive",
        closeMode: "request",
        signalRoutes: {
          emits: [{
            routeKey: `auth-${area}-login-close-request`,
            capabilityId: "closeRequest",
            scope: "area",
            channel: "dialog",
            action: "close",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
            receiver: createPhiAuthControllerAddress(),
          }],
          listens: [
            {
              routeKey: `auth-${area}-login-open`,
              capabilityId: "open",
              scope: "area",
              channel: "dialog",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", ids.overlayLogin),
            },
            {
              routeKey: `auth-${area}-login-close`,
              capabilityId: "close",
              scope: "area",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", ids.overlayLogin),
            },
          ],
        },
      },
    }],
    layoutNodes: [buildPhiCmsLayoutNode({
      id: ids.layoutBody,
      siteId: page.siteId,
      parentLayoutNodeId: null,
      creationPreset: { layoutKind: "verticalflex", preset: "panel" },
      typeKey: "flex-vertical",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label: `${area} auth login body`,
      config: {
        gap: PHI_SPACE.base,
        padding: PHI_SPACE.base,
        width: "100%",
        maxWidth: "100%",
        margin: 0,
        background: PHI_COLOR.bgLayout,
        border: false,
      },
    })],
    contentWidgets: [buildPhiCmsWidgetNode({
      id: ids.widgetLogin,
      siteId: page.siteId,
      parentLayoutNodeId: ids.layoutBody,
      typeKey: "form",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label: `${area} auth login form`,
      config: {
        formId: PHI_SHARED_FORM_IDS.login,
        formConfig: {
          forgotPasswordHref: localizeAreaPath(runtime.locale.current, "public", "/reset-password"),
        },
      },
      contentId: null,
    })],
  };
}
