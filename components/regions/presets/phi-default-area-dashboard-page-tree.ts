import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import {
  PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
  PHI_DASHBOARD_CARD_RESOURCE_KEY,
} from "../../../constants/dashboard-card-provider-keys";
import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";
import {
  getPhiAreaDashboardPageLabels,
  type PhiAreaDashboardKey,
} from "./area-dashboard-label-set";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

/**
 * The Dashboard an Area gets when it has nothing more specific to show.
 *
 * Admin and Builder each carry one written for them -- the first reports on the installation, the
 * second opens the authoring controls -- and neither generalises. What the remaining Areas need is a
 * page that exists: the Area root forwards to the Dashboard, so an Area without one has no front door
 * at all.
 *
 * It used to be a single card repeating the Area's own description, on the grounds that the Builder
 * opening an empty canvas has nothing to replace. It now places the same Collection over card
 * contributions that Admin does, which is the better answer to that: a Module puts a card here by
 * contributing one, and an Area nobody contributes to says so in its empty state instead of showing a
 * card that only describes the Area a visitor already navigated into.
 */

const SYNTHETIC_AREA_DASHBOARD_REGION_ID_BY_AREA: Record<string, number> = {
  app: -460,
  accounting: -461,
  editor: -462,
};

export async function buildPhiDefaultAreaDashboardPageTree({
  page,
  runtime,
  area,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  area: PhiAreaDashboardKey;
  presetKey: string;
}): Promise<PhiResolvedCmsPageTree> {
  const widgetIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetCards"]);
  const regionId = SYNTHETIC_AREA_DASHBOARD_REGION_ID_BY_AREA[area];
  if (regionId === undefined) {
    throw new Error(`Area "${area}" has no generic Dashboard region id.`);
  }
  const labels = await getPhiAreaDashboardPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }, area);
  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId,
    regionConfig: { border: false },
  });

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: "Dashboard", value: labels.pageTitle },
      description: { msgId: 0, source: "", value: labels.pageDescription },
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      nodes.widget({
        id: widgetIds.widgetCards,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "collection-view",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        label: `${area} dashboard cards`,
        config: {
          presentation: {
            mode: "grid",
            emptyDescription: labels.emptyDescription,
          },
          features: {
            // No toolbar of its own, for the reason the Admin Dashboard states: a reload that refreshed
            // the list but not the payloads would be a button that lies.
            tools: { mode: "external" },
            pagination: { enabled: false },
          },
          source: {
            providerKey: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
            resourceKey: PHI_DASHBOARD_CARD_RESOURCE_KEY,
            params: { area },
          },
        },
      }),
    ],
  };
}
