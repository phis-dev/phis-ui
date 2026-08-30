import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/admin/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { resolvePhiShellMetric } from "../../../helpers/shell-region-style";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";
import { createPhiCoreRuntimeControllerAddress } from "../../runtime/core-runtime-controller-address";

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
  "widgetHeaderAreaMenu",
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
  const shellHeaderMainHeight = resolvePhiShellMetric(runtime.site.theme?.shell, "height", {
    family: "header",
    region: "main",
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
        config: {
          mode: runtime.site.theme?.mode ?? "light",
          sticky: false,
          effect: "glass",
          shadow: "none",
          size: { height: "55px" },
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
          mode: runtime.site.theme?.mode ?? "light",
          sticky: true,
          effect: "glass",
          shadow: "soft",
          border: false,
          size: {
            height: `${typeof shellHeaderMainHeight === "number" ? shellHeaderMainHeight : 55}px`,
          },
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
          mode: runtime.site.theme?.mode ?? "light",
          sticky: true,
          fullHeight: true,
          size: { width: `${resolvedShellLeftWidth}px` },
          ...(typeof shellSiderLeftOffsetTop === "number" ? { offsetTop: shellSiderLeftOffsetTop } : { offsetTop: 0 }),
          collapsible: true,
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderMain,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin header main three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin header top three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          paddingLeft: PHI_SPACE.base,
          paddingRight: PHI_SPACE.base,
          style: { height: "100%" },
        },
      }),
      buildPhiCmsLayoutNode({
        typeKey: "flex",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTopActions,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
          height: "100%",
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutSiderLeft,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin sider left stack",
        config: {
          anchor: {
            horizontal: "center",
            vertical: "top",
          },
          gap: 0,
          padding: PHI_SPACE.xs,
          paddingTop: 0,
          maxWidth: resolvedShellLeftWidth,
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "switch",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderTopThemeModeSwitch,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Theme mode switch",
        config: {
          defaultChecked: runtime.site.theme?.mode === "dark",
          checkedChildren: "Dark",
          unCheckedChildren: "Light",
          key: "themeMode",
          signalRoutes: {
            emits: [
              {
                routeKey: "admin-header-theme-mode-change",
                capabilityId: "change",
                scope: "site",
                channel: "themeMode",
                action: "change",
                valueType: "boolean",
                receiver: createPhiCoreRuntimeControllerAddress(),
              },
            ],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "page-title",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderMainPageTitle,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Page title",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "area-menu",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderAreaMenu,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 15,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin header main area menu",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "account",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetHeaderTopAccount,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 20,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin header top account",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "sidebar-navigation",
        id: SYNTHETIC_ADMIN_WIDGET_IDS.widgetSiderLeftNav,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_LAYOUT_IDS.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin sider left navigation",
        config: {
          side: "left",
          width: resolvedShellLeftWidth,
          navKey: "admin:sidebar",
        },
        contentId: null,
      }),
    ],
  };
}
