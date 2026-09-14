import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";

import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";
import { getPhiBuilderChromeWidgetLabels } from "../../widgets/label-sets/builder-chrome";

const SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS = {
  regionHeaderBottom: -580,
  regionContent: -581,
} as const;

const SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
}, [
  "layoutHeaderBottom",
]);

const SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
}, [
  "widgetBuilderChromeControls",
]);

export async function buildPhiDefaultBuilderDashboardPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const pageTitleSource = "Dashboard";
  const pageTitle = labels.pageTitles.dashboard;
  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS.regionContent,
  });

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: {
        msgId: 0,
        source: pageTitleSource,
        value: pageTitle,
      },
      description: null,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS.regionHeaderBottom,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 25,
        config: {
          sticky: true,
          /*
           * No Effect of its own, like every other Builder Header. A `glass` authored here frosts this
           * one Region against the Site's Shell Chrome Overlay, so the Dashboard's Header stopped
           * matching the Sider and Footer beside it. What the frame looks like belongs to the Theme.
           */
          shadow: "soft",
          size: { height: "55px" },
          offsetTop: 55,
        },
      },
      scaffold.region,
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "builder dashboard header bottom",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      scaffold.layoutNode,
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "builder-chrome-controls",
        id: SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS.widgetBuilderChromeControls,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "builder dashboard header main controls",
        config: {
          editorPreviewDisabled: true,
          actionsDisabled: true,
          debugDisabled: true,
        },
        contentId: null,
      }),
    ],
  };
}
