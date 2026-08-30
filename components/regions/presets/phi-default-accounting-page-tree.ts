import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/accounting/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";

const SYNTHETIC_ACCOUNTING_REGION_IDS = {
  regionContent: -451,
} as const;

const SYNTHETIC_ACCOUNTING_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  presetKey: "accounting-page",
}, [
  "layoutContent",
]);

const SYNTHETIC_ACCOUNTING_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  presetKey: "accounting-page",
}, [
  "widgetOverview",
]);

export async function buildPhiDefaultAccountingPageTree({
  page,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_ACCOUNTING_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_ACCOUNTING_LAYOUT_IDS.layoutContent,
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
        id: SYNTHETIC_ACCOUNTING_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        typeKey: "grid",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "accounting grid",
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
        id: SYNTHETIC_ACCOUNTING_WIDGET_IDS.widgetOverview,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ACCOUNTING_LAYOUT_IDS.layoutContent,
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
