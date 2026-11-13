import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
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
  }, ["layoutCentre"]);
  const widgets = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetMain"]);

  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: -483 });
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: label, value: label },
      description: null,
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [
      // The base scaffold every module Page stands on.
      scaffold.layoutNode,
      /*
       * The sign-out stands in the middle of the screen, where the scaffold alone would put it at the
       * top: a vertical Flex that fills the scaffold and centres its one Widget both ways. No panel preset,
       * so it adds no padding to the scaffold's.
       */
      nodes.layout({
        typeKey: "flex-vertical",
        id: layouts.layoutCentre,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label,
        config: { anchor: { horizontal: "center", vertical: "middle" } },
      }),
    ],
    contentWidgets: [nodes.widget({
      typeKey: widgetTypeKey,
      id: widgets.widgetMain,
      parentLayoutNodeId: layouts.layoutCentre,
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      label,
      flags: PhiCmsFlags.NoTranslate,
      config: {},
    })],
  };
}
