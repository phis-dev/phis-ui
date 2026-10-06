import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { PHI_COLOR, PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import type { PhiBlockRuntime } from "../../../../types/widget-runtime";
import {
  buildPhiLoginNodes,
  PHI_LOGIN_FORM_LAYOUT_CONFIG,
} from "./phi-login-form-nodes";
import { getPhiLoginFormLabels } from "../../../../components/widgets/label-sets/account";
import { createPhiAuthControllerAddress, PHI_AUTH_CONTROLLER_TYPE } from "../controller/address";
import { createPhiRuntimeFormControllerAddress } from "../../../../components/forms/runtime-form-controller-address";
import {
  PHI_AUTH_LOGIN_OVERLAY_IDS,
  type PhiAuthLoginOverlayArea,
} from "../overlay-ids";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

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
  const login = buildPhiLoginNodes({
    ids,
    siteId: page.siteId,
    visibilityMask: page.visibilityMask,
    parentLayoutNodeId: ids.layoutBody,
    locale: runtime.locale.current,
    authControllerAddress: createPhiAuthControllerAddress(),
  });
  const labels = await getPhiLoginFormLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  const nodes = createPhiCmsPresetNodes(page);
  const overlayAddress = createPhiSignalAddress("cms", ids.overlayLogin);
  return {
    page,
    /*
     * Whom the Auth Controller opens, closes and fills: this Overlay and its Form.
     *
     * The Controller used to look both up in the Area's preset id map. They are this tree's nodes, so
     * this tree names them, and the setting arrives with the Overlay's zones as the Controller does
     * (`materializePhiOverlayRuntimeControllerSettings`).
     */
    controllerSettings: [{
      type: PHI_AUTH_CONTROLLER_TYPE,
      instanceKey: "default",
      mountScope: "area",
      config: {
        signalRoutes: {
          emits: [
            { routeKey: `auth-${area}-login-controller-open`, capabilityId: "loginOverlayOpen", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: overlayAddress },
            { routeKey: `auth-${area}-login-controller-close`, capabilityId: "loginOverlayClose", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
            {
              routeKey: `auth-${area}-login-controller-values`,
              capabilityId: "loginValues",
              scope: "area",
              channel: "values",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
              receiver: createPhiRuntimeFormControllerAddress(`widget-${ids.widgetLogin}`),
            },
          ],
        },
      },
    }],
    regions: [],
    overlays: [nodes.overlay({
      id: ids.overlayLogin,
      overlayType: "modal",
      bodyLayoutNodeId: ids.layoutBody,
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
    })],
    layoutNodes: [nodes.layout({
      id: ids.layoutBody,
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
      label: `${area} auth login body`,
      config: {
        ...PHI_LOGIN_FORM_LAYOUT_CONFIG,
        gap: PHI_SPACE.sm,
        padding: PHI_SPACE.base,
        margin: 0,
        surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
      },
    }), ...login.layoutNodes],
    contentWidgets: login.contentWidgets,
  };
}
