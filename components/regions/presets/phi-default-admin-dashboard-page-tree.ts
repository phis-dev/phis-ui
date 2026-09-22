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
import { getPhiAdminDashboardPageLabels } from "./admin-dashboard-label-set";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

/**
 * The Admin Dashboard: one Widget, and whatever the Area's Modules offer it.
 *
 * It used to be a four-slot grid with the figures read here -- the process uptime, the user count, the
 * locales -- and the three subjects belonged to three other Modules while the page that drew them
 * belonged to this one. Now the page places a Collection over the card contributions and the Modules
 * answer for their own: Observability for the runtime, User Management for the accounts, Localization
 * for the languages. Adding a fifth card is a contribution, not an edit to this file.
 *
 * The page keeps its own title and description. What a Dashboard is called is the page's, not a card's.
 */

const SYNTHETIC_ADMIN_DASHBOARD_REGION_IDS = {
  regionContent: -410,
} as const;

const SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "admin-dashboard-page",
}, [
  "widgetCards",
]);

export async function buildPhiDefaultAdminDashboardPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiAdminDashboardPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_ADMIN_DASHBOARD_REGION_IDS.regionContent,
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
      description: {
        msgId: 0,
        source: "Review the current site status and core runtime counters at a glance.",
        value: labels.pageDescription,
      },
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      nodes.widget({
        id: SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS.widgetCards,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "collection-view",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        label: "admin dashboard cards",
        config: {
          presentation: {
            mode: "grid",
            emptyDescription: labels.emptyDescription,
          },
          features: {
            // No toolbar of its own: what a card shows and when it is asked again is the contribution's
            // business and, later, the Controller's. A reload button that refreshed the list but not the
            // payloads would be a button that lies.
            tools: { mode: "external" },
            pagination: { enabled: false },
          },
          source: {
            providerKey: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
            resourceKey: PHI_DASHBOARD_CARD_RESOURCE_KEY,
            // Which Dashboard this is. A page belongs to one Area, so the preset that places the Widget
            // is what knows it; the path it stands on is read live, because that is what a Site changes.
            params: { area: "admin" },
          },
        },
      }),
    ],
  };
}
