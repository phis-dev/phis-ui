import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/editor/ids";
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
import { getPhiEditorAreaLabels } from "./editor-label-set";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";

const SYNTHETIC_EDITOR_REGION_IDS = {
  regionHeaderTop: -140,
  regionHeaderMain: -141,
  regionSiderLeft: -150,
} as const;

const SYNTHETIC_EDITOR_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
}, [
  "layoutHeaderTop",
  "layoutHeaderTopActions",
  "layoutHeaderMain",
  "layoutSiderLeft",
]);

const SYNTHETIC_EDITOR_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
}, [
  "widgetHeaderMainPageTitle",
  "widgetHeaderTopAreaMenu",
  "widgetHeaderTopAccount",
  "widgetSiderLeftNav",
]);

export async function buildPhiDefaultEditorAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiEditorAreaLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
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
    page,
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("editor"),
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_EDITOR_REGION_IDS.regionHeaderTop,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderTop,
        rootLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderTop,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 10,
        config: {
          mode: runtime.site.theme?.mode ?? "light",
          sticky: false,
          size: { height: "55px" },
        },
      },
      {
        id: SYNTHETIC_EDITOR_REGION_IDS.regionHeaderMain,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderMain,
        rootLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderMain,
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
        id: SYNTHETIC_EDITOR_REGION_IDS.regionSiderLeft,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.SiderLeft,
        rootLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutSiderLeft,
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
        id: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderMain,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor header main three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderTop,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor header top three column",
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
        id: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderTopActions,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor header top actions",
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
        id: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutSiderLeft,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor sider left stack",
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
        typeKey: "page-title",
        id: SYNTHETIC_EDITOR_WIDGET_IDS.widgetHeaderMainPageTitle,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderMain,
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
        id: SYNTHETIC_EDITOR_WIDGET_IDS.widgetHeaderTopAreaMenu,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor area menu",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "account",
        id: SYNTHETIC_EDITOR_WIDGET_IDS.widgetHeaderTopAccount,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 20,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor account",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "sidebar-navigation",
        id: SYNTHETIC_EDITOR_WIDGET_IDS.widgetSiderLeftNav,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_EDITOR_LAYOUT_IDS.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "editor sider left navigation",
        config: {
          side: "left",
          width: resolvedShellLeftWidth,
          navKey: "editor:sidebar",
          items: [
            {
              key: "editor-dashboard",
              label: labels.dashboard,
              href: "/",
              icon: "antd:dashboard",
            },
            {
              key: "editor-text",
              label: labels.text,
              href: "/text",
              icon: "antd:file-text",
            },
            {
              key: "editor-translations",
              label: labels.translations,
              href: "/translations",
              icon: "antd:translation",
            },
            {
              key: "editor-profile",
              label: labels.profile,
              href: "/profile",
              icon: "antd:user",
            },
          ],
        },
        contentId: null,
      }),
    ],
  };
}
