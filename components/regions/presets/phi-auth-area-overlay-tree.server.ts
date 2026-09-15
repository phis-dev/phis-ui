import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import {
  buildPhiLoginFormWidgetConfig,
  PHI_LOGIN_FORM_LAYOUT_CONFIG,
} from "./phi-login-form-nodes";
import { getPhiLoginFormLabels } from "../../widgets/label-sets/account";
import { createPhiAuthControllerAddress } from "../../runtime/area-base-controller-addresses";
import {
  PHI_AUTH_LOGIN_OVERLAY_IDS,
  type PhiAuthLoginOverlayArea,
} from "../../runtime/auth-overlay-ids";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

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
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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
        /*
         * A login asks for two short lines and is not a page. The width has a floor rather than a
         * preference, though: the form inside decides its own columns from its own measured width, and
         * under 360px it puts every label back above its input. What is left over for chrome is about
         * a dozen pixels, so 400 keeps the two columns with room to spare.
         */
        width: { compact: "calc(100vw - 32px)", medium: 400, wide: 420 },
        mountPolicy: "lazy-keep",
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
      /*
       * A Form Layout, because what stands in it is a form. It is the node kind that owns the label
       * column: `labelEnd` is a line on the same 24-track grid every form range is written against,
       * so the two columns of the Login are decided here rather than inside the form. Line 9 is a third.
       */
      creationPreset: { layoutKind: "verticalflex", preset: "panel" },
      typeKey: "flex-vertical",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label: `${area} auth login body`,
      config: {
        ...PHI_LOGIN_FORM_LAYOUT_CONFIG,
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
      config: buildPhiLoginFormWidgetConfig(runtime.locale.current),
      contentId: null,
    })],
  };
}
