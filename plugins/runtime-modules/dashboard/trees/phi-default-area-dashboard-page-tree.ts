import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../ids";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import {
  getPhiAreaDashboardPageLabels,
  type PhiAreaDashboardKey,
} from "./area-dashboard-label-set";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { buildPhiDashboardCardsPageTree } from "./dashboard-cards-page-tree";

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
  return buildPhiDashboardCardsPageTree({
    page,
    area,
    regionId,
    widgetId: widgetIds.widgetCards,
    labels,
    descriptionSource: "",
  });
}
