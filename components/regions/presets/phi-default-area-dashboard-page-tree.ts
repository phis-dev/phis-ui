import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

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
  const layoutIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent"]);
  const widgetIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetOverview"]);
  const regionId = SYNTHETIC_AREA_DASHBOARD_REGION_ID_BY_AREA[area];
  if (regionId === undefined) {
    throw new Error(`Area "${area}" has no generic Dashboard region id.`);
  }

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
    regions: [
      {
        id: regionId,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: layoutIds.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1120 },
          margin: "0 auto",
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: layoutIds.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        typeKey: "grid",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: `${area} dashboard grid`,
        config: {
          align: "stretch",
          justify: "start",
          wrap: false,
          slotPlacements: [{ slotIndex: 0, span: { compact: 24, medium: 24, wide: 24 } }],
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: widgetIds.widgetOverview,
        siteId: page.siteId,
        parentLayoutNodeId: layoutIds.layoutContent,
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
