import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../../constants/cms-layout-types";
import {
  PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
  PHI_DASHBOARD_CARD_RESOURCE_KEY,
} from "../../../../constants/dashboard-card-provider-keys";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";

/**
 * A Dashboard page: one Collection over the card contributions of an Area's Modules.
 *
 * Admin's and the generic Area's Dashboard are this page with their own ids, labels and Area; a Module
 * puts a card here by contributing one. No toolbar of its own: what a card shows and when it is asked
 * again is the contribution's business and, later, the Controller's. A reload button that refreshed the
 * list but not the payloads would be a button that lies.
 */
export function buildPhiDashboardCardsPageTree({
  page,
  area,
  regionId,
  widgetId,
  labels,
  descriptionSource,
}: {
  page: PhiCmsPageNode;
  area: string;
  regionId: number;
  widgetId: PhiCmsInstanceId;
  labels: { pageTitle: string; pageDescription: string; emptyDescription: string };
  /** The untranslated description, where the page has one of its own to say. */
  descriptionSource: string;
}): PhiResolvedCmsPageTree {
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId });
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: "Dashboard", value: labels.pageTitle },
      description: { msgId: 0, source: descriptionSource, value: labels.pageDescription },
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      nodes.widget({
        id: widgetId,
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
            tools: { mode: "external" },
            pagination: { enabled: false },
          },
          source: {
            providerKey: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
            resourceKey: PHI_DASHBOARD_CARD_RESOURCE_KEY,
            // Which Dashboard this is. A page belongs to one Area, so the preset that places the Widget
            // is what knows it; the path it stands on is read live, because that is what a Site changes.
            params: { area },
          },
        },
      }),
    ],
  };
}
