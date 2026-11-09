import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../components/regions/presets/phi-base-page-layout";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../helpers/cms-preset-nodes";
import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../types/cms";
import { createPhiPresetCmsInstanceIdMap } from "../../types/cms-instance-id";

/** Synthetic Region id; negative, and unique among the base Presets. */
const SYNTHETIC_SEARCH_REGION_IDS = {
  regionContent: -260,
} as const;

/**
 * The results Page every indexed Area brings (SEARCH.md): the box, so a reader can search again without
 * going back, and under it the results, which read the query from the page's address.
 *
 * One tree for both Areas because the Page is the same in both; what differs -- which Areas are searched
 * -- is decided by the Widget from where it stands, not written into the tree. The ids are derived from
 * the preset identity, so the Public and the App Page are two sets of nodes.
 */
export async function buildPhiDefaultSearchPageTree({
  page,
  ownerModuleId,
  presetKey,
}: {
  page: PhiCmsPageNode;
  ownerModuleId: `${string}/${string}`;
  presetKey: string;
}): Promise<PhiResolvedCmsPageTree> {
  const identity = { domain: "page", ownerModuleId, presetKey } as const;
  const layoutIds = createPhiPresetCmsInstanceIdMap(identity, ["layoutContent"]);
  const widgetIds = createPhiPresetCmsInstanceIdMap(identity, ["widgetBox", "widgetResults"]);
  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_SEARCH_REGION_IDS.regionContent });
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: layoutIds.layoutContent,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: "search page stack",
        config: { gap: PHI_SPACE.lg },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "search-box",
        id: widgetIds.widgetBox,
        parentLayoutNodeId: layoutIds.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "search page box",
        config: { controlSize: "large" },
      }),
      nodes.widget({
        typeKey: "search-results",
        id: widgetIds.widgetResults,
        parentLayoutNodeId: layoutIds.layoutContent,
        sortOrder: 1,
        label: "search page results",
        config: {},
        // A vertical stack flows by slot: one child per `slotIndex`, in that order.
        slotIndex: 1,
      }),
    ],
  };
}
