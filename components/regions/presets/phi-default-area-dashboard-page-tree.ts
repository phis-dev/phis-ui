import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";

/**
 * The Dashboard an Area gets when it has nothing more specific to show.
 *
 * Admin and Builder each carry a Dashboard written for them -- one reports on the installation, the
 * other opens the authoring controls -- and neither generalises. What the remaining Areas need is a
 * page that exists: the Area root forwards to the Dashboard, so an Area without one has no front door
 * at all. This is that page, and it is deliberately a single card rather than an empty canvas, so the
 * Builder opening it sees something to replace.
 */

const SYNTHETIC_AREA_DASHBOARD_REGION_ID_BY_AREA: Record<string, number> = {
  app: -460,
  accounting: -461,
  editor: -462,
};

export function buildPhiDefaultAreaDashboardPageTree({
  page,
  area,
  presetKey,
  title,
  eyebrow,
  description,
}: {
  page: PhiCmsPageNode;
  area: string;
  presetKey: string;
  title: string;
  eyebrow: string;
  description: string;
}): PhiResolvedCmsPageTree {
  const widgetIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetOverview"]);
  const regionId = SYNTHETIC_AREA_DASHBOARD_REGION_ID_BY_AREA[area];
  if (regionId === undefined) {
    throw new Error(`Area "${area}" has no generic Dashboard region id.`);
  }
  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId,
    regionConfig: { maxSize: { width: 1120 }, margin: "0 auto" },
  });

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: title, value: title },
      description: null,
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: widgetIds.widgetOverview,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "card",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: eyebrow,
        config: {
          eyebrow,
          title: eyebrow,
          description,
          variant: "compact",
          translate: true,
        },
      }),
    ],
  };
}
