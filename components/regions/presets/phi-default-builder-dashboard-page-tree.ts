import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX, PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { getPhiBuilderChromeWidgetLabels } from "../../widgets/label-sets/builder-chrome";

const SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS = {
  regionHeaderBottom: -580,
  regionContent: -581,
} as const;

const SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
}, [
  "layoutHeaderBottom",
  "layoutContent",
]);

const SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
}, [
  "widgetBuilderChromeControls",
  "widgetTitle",
]);

export async function buildPhiDefaultBuilderDashboardPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const pageTitleSource = "Dashboard";
  const pageTitle = labels.pageTitles.dashboard;

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
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
      {
        id: SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS.regionHeaderBottom,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 25,
        config: {
          sticky: true,
          effect: "glass",
          shadow: "soft",
          size: { height: "55px" },
          offsetTop: 55,
        },
      },
      {
        id: SYNTHETIC_BUILDER_DASHBOARD_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1280 },
          margin: "0 auto",
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "builder dashboard header bottom",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "builder dashboard content",
        config: {
          gap: PHI_SPACE.base,
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: PHI_SPACE.base,
          background: PHI_COLOR.bgLayout,
          border: false,
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "builder-chrome-controls",
        id: SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS.widgetBuilderChromeControls,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutContent,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "builder dashboard header main controls",
        config: {
          editorPreviewDisabled: true,
          actionsDisabled: true,
          debugDisabled: true,
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "page-title",
        id: SYNTHETIC_BUILDER_DASHBOARD_WIDGET_IDS.widgetTitle,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_BUILDER_DASHBOARD_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "builder dashboard title",
        config: {},
        contentId: null,
      }),
    ],
  };
}
