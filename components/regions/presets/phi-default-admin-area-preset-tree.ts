import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/admin/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight, resolvePhiShellMetric } from "../../../helpers/shell-region-style";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";

const SYNTHETIC_ADMIN_REGION_IDS = {
  regionHeaderTop: -126,
  regionHeaderMain: -127,
  regionSiderLeft: -130,
} as const;

const SYNTHETIC_ADMIN_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  presetKey: "admin-area-preset",
}, [
  "layoutHeaderTop",
  "layoutHeaderTopActions",
  "layoutHeaderMain",
  "layoutSiderLeft",
]);

const SYNTHETIC_ADMIN_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  presetKey: "admin-area-preset",
}, [
  "widgetSiderLeftNav",
  "widgetHeaderTopAccount",
  "widgetHeaderTopThemeModeSwitch",
  "widgetHeaderMainPageTitle",
]);

export async function buildPhiDefaultAdminAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const shellSiderLeftOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "sider",
    region: "left",
  });
  const shellHeaderMainOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "header",
    region: "main",
  });
  const shellSiderLeftWidth = resolvePhiShellMetric(runtime.site.theme?.shell, "width", {
    family: "sider",
    region: "left",
  });
  const resolvedShellLeftWidth =
    typeof shellSiderLeftWidth === "number" ? shellSiderLeftWidth : PHI_LAYOUT.sidebarWidth;
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: {
      ...page,
      status: PhiCmsStatus.Published,
    },
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("admin"),
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_ADMIN_REGION_IDS.regionHeaderTop,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderTop,
        rootLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 10,
        // Structure only: the frame's look is the Theme's (SHELL.md, Shell Chrome Overlay).
        config: {
          sticky: false,
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "top")}px` },
        },
      },
      {
        id: SYNTHETIC_ADMIN_REGION_IDS.regionHeaderMain,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderMain,
        rootLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderMain,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 20,
        config: {
          sticky: true,
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main")}px` },
          offsetTop: typeof shellHeaderMainOffsetTop === "number" ? shellHeaderMainOffsetTop : 0,
        },
      },
      {
        id: SYNTHETIC_ADMIN_REGION_IDS.regionSiderLeft,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.SiderLeft,
        rootLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutSiderLeft,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 25,
        config: {
          sticky: true,
          fullHeight: true,
          size: { width: `${resolvedShellLeftWidth}px` },
          ...(typeof shellSiderLeftOffsetTop === "number" ? { offsetTop: shellSiderLeftOffsetTop } : { offsetTop: 0 }),
          collapsible: true,
        },
      },
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderMain,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "admin header main three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "admin header top three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          paddingLeft: PHI_SPACE.base,
          paddingRight: PHI_SPACE.base,
          style: { height: "100%" },
        },
      }),
      nodes.layout({
        typeKey: "flex",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTopActions,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "admin header top actions",
        config: {
          anchor: {
            horizontal: "right",
            vertical: "middle",
          },
          gap: 12,
          verticalSeparators: false,
          separatorBeforeFirst: true,
          separatorSpan: "50%",
          wrap: false,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutSiderLeft,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "admin sider left stack",
        config: {
          anchor: {
            horizontal: "center",
            vertical: "top",
          },
          gap: 0,
          padding: PHI_SPACE.xs,
          paddingTop: 0,
        },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "theme-mode-switch",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderTopThemeModeSwitch,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: "Theme mode switch",
        config: {
          checkedChildren: "Dark",
          unCheckedChildren: "Light",
        },
      }),
      nodes.widget({
        typeKey: "page-title",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderMainPageTitle,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        label: "Page title",
        config: {},
      }),
      nodes.widget({
        typeKey: "account",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderTopAccount,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 20,
        label: "admin header top account",
        config: {},
      }),
      nodes.widget({
        typeKey: "sidebar-navigation",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetSiderLeftNav,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "admin sider left navigation",
        config: {
          side: "left",
          width: resolvedShellLeftWidth,
          navKey: "admin:sidebar",
        },
      }),
    ],
  };
}
