import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiSignalAddress } from "../../../types/signals";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { getPhiAvatarWidgetLabels } from "../../widgets/label-sets/avatar";
import { PHI_AVATAR_OVERLAY_IDS } from "../../runtime/avatar-overlay-ids";

/**
 * The Avatar Module's Overlay: one modal holding the picker.
 *
 * `mountPolicy` is the default, so the body is built on first open rather than on every App page --
 * an upload control nobody has asked for should not cost a render. The Overlay listens for `open` and
 * `close` on its own address, which is all a Widget elsewhere needs to reach it, and emits nothing:
 * there is no Controller here to tell, because binding the picture is a route call the picker makes.
 */
export async function buildPhiAvatarAreaPickerOverlayTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const ids = PHI_AVATAR_OVERLAY_IDS;
  const labels = await getPhiAvatarWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return {
    page,
    regions: [],
    overlays: [{
      id: ids.overlayPicker,
      overlayType: "modal",
      headerLayoutNodeId: null,
      bodyLayoutNodeId: ids.layoutBody,
      footerPresentation: "none",
      footerLayoutNodeId: null,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 0,
      label: "app avatar picker",
      config: {
        title: labels.overlayTitle,
        controlSize: "medium",
        width: { compact: "calc(100vw - 32px)", medium: 480, wide: 520 },
        /*
         * `immediate`, not `request`. Request mode keeps the Overlay open and emits a `closeRequest`
         * for a Controller to answer -- and this Module has no Controller, so the X and the mask were
         * asking a question nobody was listening for. Nothing here is transactional enough to need
         * that: an upload abandoned mid-flight leaves a staging object and an expiring session, both
         * of which the maintenance path already reaches.
         */
        closeMode: "immediate",
        signalRoutes: {
          listens: [
            {
              routeKey: "avatar-app-picker-open",
              capabilityId: "open",
              scope: "area",
              channel: "dialog",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", ids.overlayPicker),
            },
            {
              routeKey: "avatar-app-picker-close",
              capabilityId: "close",
              scope: "area",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", ids.overlayPicker),
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
      label: "app avatar picker body",
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
      id: ids.widgetUpload,
      siteId: page.siteId,
      parentLayoutNodeId: ids.layoutBody,
      typeKey: "account-avatar-picker",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label: "app avatar picker upload",
      config: {},
      contentId: null,
    })],
  };
}
