import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType, PhiCmsRegionType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight } from "../../../../helpers/shell-region-style";

import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { buildPhiDashboardCardsWidget } from "./dashboard-cards-page-tree";
import { getPhiDashboardCardsEmptyDescription } from "./area-dashboard-label-set";

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
  "widgetCards",
]);

export async function buildPhiDefaultBuilderDashboardPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const translatorOptions = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
  const [labels, emptyDescription] = await Promise.all([
    getPhiBuilderChromeWidgetLabels(translatorOptions),
    getPhiDashboardCardsEmptyDescription(translatorOptions),
  ]);
  const pageTitleSource = "Dashboard";
  const pageTitle = labels.pageTitles.dashboard;
  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS.regionContent,
  });

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
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
      nodes.region({
        id: SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS.regionHeaderBottom,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        sortOrder: 25,
        config: {
          flags: PhiCmsFlags.Sticky,
          /*
           * No Effect or Shadow of its own, like every other Builder Header. A `glass` authored here
           * frosts this one Region against the Site's Shell Chrome Overlay, so the Dashboard's Header
           * stopped matching the Sider and Footer beside it. What the frame looks like belongs to the Theme.
           */
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom")}px` },
          offsetTop: resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main"),
        },
      }),
      scaffold.region,
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "builder dashboard header bottom",
        config: {
          balancedSides: true,
          contentAlign: "center",
        },
      }),
      scaffold.layoutNode,
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "builder-chrome-controls",
        id: SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS.widgetBuilderChromeControls,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        // After the cards: it draws nothing, and first in the column its empty slot added the layout's gap
        // above them.
        slotIndex: 1,
        label: "builder dashboard header main controls",
        config: {
          editorPreviewDisabled: true,
          actionsDisabled: true,
          debugDisabled: true,
        },
      }),
      /*
       * The cards the Builder's Modules contribute: the same Collection the other Dashboards are made
       * of, so a Module puts a card here the way it does anywhere else.
       */
      buildPhiDashboardCardsWidget({
        nodes,
        widgetId: SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS.widgetCards,
        area: "builder",
        slotIndex: 0,
        emptyDescription,
      }),
    ],
  };
}
