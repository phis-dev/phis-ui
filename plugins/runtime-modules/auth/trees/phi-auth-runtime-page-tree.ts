import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType, PhiCmsRegionType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";

export function buildPhiAuthRuntimePageTree({
  page,
  presetKey,
  widgetTypeKey,
  label,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
  widgetTypeKey: "auth-logout";
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

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: label, value: label },
      description: null,
    },
    overlays: [],
    regions: [nodes.region({
      id: -483,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: layouts.layoutRoot,
      sortOrder: 30,
      config: { border: false },
    })],
    layoutNodes: [nodes.layout({
      id: layouts.layoutRoot,
      parentLayoutNodeId: null,
      creationPreset: { layoutKind: "content", preset: "panel" },
      typeKey: "content",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      label,
      config: {},
    })],
    contentWidgets: [nodes.widget({
      typeKey: widgetTypeKey,
      id: widgets.widgetMain,
      parentLayoutNodeId: layouts.layoutRoot,
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      label,
      flags: PhiCmsFlags.NoTranslate,
      config: {},
    })],
  };
}
