import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../ids";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { getPhiAdminDashboardPageLabels } from "./admin-dashboard-label-set";
import { buildPhiDashboardCardsPageTree } from "./dashboard-cards-page-tree";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

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
  return buildPhiDashboardCardsPageTree({
    page,
    area: "admin",
    regionId: SYNTHETIC_ADMIN_DASHBOARD_REGION_IDS.regionContent,
    widgetId: SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS.widgetCards,
    labels,
    descriptionSource: "Review the current site status and core runtime counters at a glance.",
  });
}
