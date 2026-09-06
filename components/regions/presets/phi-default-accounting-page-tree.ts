import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/accounting/ids";
import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";

const SYNTHETIC_ACCOUNTING_REGION_IDS = {
  regionContent: -451,
} as const;

const SYNTHETIC_ACCOUNTING_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  presetKey: "accounting-overview-page",
}, [
  "widgetOverview",
]);

export async function buildPhiDefaultAccountingPageTree({
  page,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_ACCOUNTING_REGION_IDS.regionContent,
    regionConfig: { maxSize: { width: 1120 }, margin: "0 auto" },
  });

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ACCOUNTING_WIDGET_IDS.widgetOverview,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "card",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Accounting",
        config: {
          eyebrow: "Accounting",
          title: "Accounting",
          description: "Invoices and billing workflows for this site.",
          variant: "compact",
          translate: true,
        },
      }),
    ],
  };
}
