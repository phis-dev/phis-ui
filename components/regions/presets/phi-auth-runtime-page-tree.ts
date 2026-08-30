import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

export function buildPhiAuthRuntimePageTree({
  page,
  presetKey,
  widgetTypeKey,
  label,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  widgetTypeKey: "auth-logout" | "auth-security";
  label: string;
}): PhiResolvedCmsPageTree {
  const layouts = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutRoot"]);
  const widgets = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetMain"]);

  return {
    page: { ...page, pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published },
    pageMeta: {
      title: { msgId: 0, source: label, value: label },
      description: null,
    },
    overlays: [],
    regions: [{
      id: widgetTypeKey === "auth-security" ? -484 : -483,
      pageId: page.id,
      areaPresetId: null,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: layouts.layoutRoot,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 30,
      config: { maxSize: { width: 1440 }, margin: "0 auto", border: false },
    }],
    layoutNodes: [buildPhiCmsLayoutNode({
      id: layouts.layoutRoot,
      siteId: page.siteId,
      parentLayoutNodeId: null,
      creationPreset: { layoutKind: "content", preset: "panel" },
      typeKey: "content",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label,
      config: { width: "100%", maxWidth: "100%", margin: 0 },
    })],
    contentWidgets: [buildPhiCmsWidgetNode({
      typeKey: widgetTypeKey,
      id: widgets.widgetMain,
      siteId: page.siteId,
      parentLayoutNodeId: layouts.layoutRoot,
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label,
      config: { translate: false },
      contentId: null,
    })],
  };
}
