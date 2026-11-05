import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../ids";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";

import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiBasePageContentScaffold } from "../../../../components/regions/presets/phi-base-page-layout";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { buildPhiDashboardCardsWidget } from "./dashboard-cards-page-tree";
import { getPhiDashboardCardsEmptyDescription } from "./area-dashboard-label-set";

/*
 * No Header bottom band: the Dashboard has no commands -- nothing to save, preview or publish -- and the
 * band stood empty under the title.
 */
const SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS = {
  regionContent: -581,
} as const;

const SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
}, [
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
      scaffold.region,
    ],
    layoutNodes: [
      scaffold.layoutNode,
    ],
    contentWidgets: [
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
