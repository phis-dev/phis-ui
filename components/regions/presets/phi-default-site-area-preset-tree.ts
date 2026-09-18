import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../../../types";
import type { PhiBuilderAreaKey } from "../../../constants/cms-areas";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsRegionType } from "../../../constants/phi-cms";
import { resolvePhiCmsWidgetPluginKey } from "../../../constants/cms-widget-types";
import { buildPhiCmsLayoutNamespacedTypeKey, resolvePhiCmsLayoutPluginKey } from "../../../constants/cms-layout-types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { trGlobal } from "../../../server-helpers/translate";
import { PHI_TR_CTX_WEB_UI_LABEL } from "../../../gateway/tr";
import { PHI_PADDING } from "../../../theme/phi-tokens";
import { buildPhiCmsWidgetTypeKey } from "../../../helpers/cms-node-factories";
import { resolvePhiBrandContact } from "../../../helpers/brand-contact";
import { resolvePhiShellHeaderHeight, resolvePhiShellMetric } from "../../../helpers/shell-region-style";
import { resolvePhiLayoutCreationPreset } from "../../../helpers/cms-layout-defaults";
import { PHI_DEFAULT_PUB_AREA_PRESET } from "./pub";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";
import {
  PHI_DEFAULT_PUB_AREA_LAYOUT_NODE_KEYS,
  PHI_DEFAULT_PUB_AREA_WIDGET_NODE_KEYS,
} from "../../../plugins/runtime-modules/preset-contracts/pub-area";

const SYNTHETIC_REGION_IDS = {
  regionHeaderTop: -1,
  regionHeaderMain: -2,
  regionHeaderBottom: -3,
  regionSiderRight: -24,
  regionFooterTop: -27,
  regionFooterMain: -28,
  regionFooterBottom: -33,
} as const;

export async function buildPhiDefaultSiteAreaPresetTree({
  page,
  runtime,
  presetKey,
  ownerModuleId,
  runtimeModuleArea,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  presetKey: string;
  ownerModuleId: PhiRuntimeModuleId;
  runtimeModuleArea: PhiBuilderAreaKey;
}): Promise<PhiResolvedCmsPageTree> {
  const PHI_DEFAULT_PUB_AREA_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "area",
    ownerModuleId,
    presetKey,
  }, PHI_DEFAULT_PUB_AREA_LAYOUT_NODE_KEYS);
  const PHI_DEFAULT_PUB_AREA_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
    domain: "area",
    ownerModuleId,
    presetKey,
  }, PHI_DEFAULT_PUB_AREA_WIDGET_NODE_KEYS);
  const navigationArea = runtimeModuleArea === "public" ? "public" : runtimeModuleArea;
  const headerMainRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "header_main",
  );
  const headerTopRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "header_top",
  );
  const headerBottomRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "header_bottom",
  );
  const siderRightRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "sider_right",
  );
  const footerMainRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "footer_main",
  );
  const footerTopRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "footer_top",
  );
  const footerBottomRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "footer_bottom",
  );
  const includeHeaderTop = page.path === "/";
  const {
    label: contactLabel,
    href: contactHref,
    icon: contactIcon,
  } = resolvePhiBrandContact(runtime);
  const defaultQuickLinksTitle = await trGlobal("Quick Links", 0, PHI_TR_CTX_WEB_UI_LABEL);
  /*
   * A template rather than a finished sentence, and left untranslated here.
   *
   * The Widget translates what it holds and fills the names in afterwards, which is the only order in
   * which a Site adopting this Preset keeps a copyright line that is about itself: resolving them here
   * wrote this Site's name and the year of the adoption into everybody's footer, where they stayed.
   * `helpers/text-placeholders.ts` has the names it may use.
   */
  const footerBottomText = "© {year} {site.name}. All rights reserved.";
  const shellHeaderTopHeight = resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "top");
  const shellHeaderTopOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "header",
    region: "top",
  });
  const shellHeaderMainHeight = resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main");
  const shellHeaderMainOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "header",
    region: "main",
  });
  const shellHeaderBottomHeight = resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom");
  const shellHeaderBottomOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "header",
    region: "bottom",
  });
  const shellSiderRightWidth = resolvePhiShellMetric(runtime.site.theme?.shell, "width", {
    family: "sider",
    region: "right",
  });
  const shellSiderRightOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "sider",
    region: "right",
  });
  const shellFooterMainHeight = resolvePhiShellMetric(runtime.site.theme?.shell, "height", {
    family: "footer",
    region: "main",
  });
  const shellFooterTopHeight = resolvePhiShellMetric(runtime.site.theme?.shell, "height", {
    family: "footer",
    region: "top",
  });
  const shellFooterBottomHeight = resolvePhiShellMetric(runtime.site.theme?.shell, "height", {
    family: "footer",
    region: "bottom",
  });
  return {
    page,
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds(runtimeModuleArea),
    overlays: [],
    regions: [
      ...(headerTopRegion && includeHeaderTop
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionHeaderTop,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.HeaderTop,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderTop,
              status: headerTopRegion.status,
              flags: headerTopRegion.flags,
              visibilityMask: headerTopRegion.visibilityMask,
              sortOrder: headerTopRegion.sortOrder,
              config: {
                ...headerTopRegion.config,
                size: { ...(headerTopRegion.config.size ?? {}), height: `${shellHeaderTopHeight}px` },
                ...(typeof shellHeaderTopOffsetTop === "number" ? { offsetTop: shellHeaderTopOffsetTop } : {}),
              },
            },
          ]
        : []),
      ...(headerMainRegion
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionHeaderMain,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.HeaderMain,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
              status: headerMainRegion.status,
              flags: headerMainRegion.flags,
              visibilityMask: headerMainRegion.visibilityMask,
              sortOrder: headerMainRegion.sortOrder,
              config: {
                ...headerMainRegion.config,
                size: { ...(headerMainRegion.config.size ?? {}), height: `${shellHeaderMainHeight}px` },
                ...(typeof shellHeaderMainOffsetTop === "number" ? { offsetTop: shellHeaderMainOffsetTop } : {}),
              },
            },
          ]
        : []),
      ...(headerBottomRegion
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionHeaderBottom,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.HeaderBottom,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderBottom,
              status: headerBottomRegion.status,
              flags: headerBottomRegion.flags,
              visibilityMask: headerBottomRegion.visibilityMask,
              sortOrder: headerBottomRegion.sortOrder,
              config: {
                ...headerBottomRegion.config,
                size: { ...(headerBottomRegion.config.size ?? {}), height: `${shellHeaderBottomHeight}px` },
                ...(typeof shellHeaderBottomOffsetTop === "number" ? { offsetTop: shellHeaderBottomOffsetTop } : {}),
              },
            },
          ]
        : []),
      ...(siderRightRegion
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionSiderRight,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.SiderRight,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutSiderRight,
              status: siderRightRegion.status,
              flags: siderRightRegion.flags,
              visibilityMask: siderRightRegion.visibilityMask,
              sortOrder: siderRightRegion.sortOrder,
              config: {
                ...siderRightRegion.config,
                ...(typeof shellSiderRightWidth === "number"
                  ? { size: { ...(siderRightRegion.config.size ?? {}), width: `${shellSiderRightWidth}px` } }
                  : {}),
                ...(typeof shellSiderRightOffsetTop === "number" ? { offsetTop: shellSiderRightOffsetTop } : {}),
              },
            },
          ]
        : []),
      ...(footerTopRegion
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionFooterTop,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.FooterTop,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterTop,
              status: footerTopRegion.status,
              flags: footerTopRegion.flags,
              visibilityMask: footerTopRegion.visibilityMask,
              sortOrder: footerTopRegion.sortOrder,
              config: {
                ...footerTopRegion.config,
                ...(typeof shellFooterTopHeight === "number"
                  ? { size: { ...(footerTopRegion.config.size ?? {}), height: `${shellFooterTopHeight}px` } }
                  : {}),
              },
            },
          ]
        : []),
      ...(footerMainRegion
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionFooterMain,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.Footer,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              status: footerMainRegion.status,
              flags: footerMainRegion.flags,
              visibilityMask: footerMainRegion.visibilityMask,
              sortOrder: footerMainRegion.sortOrder,
              config: {
                ...footerMainRegion.config,
                ...(typeof shellFooterMainHeight === "number"
                  ? { size: { ...(footerMainRegion.config.size ?? {}), height: `${shellFooterMainHeight}px` } }
                  : {}),
              },
            },
          ]
        : []),
      ...(footerBottomRegion
        ? [
            {
              id: SYNTHETIC_REGION_IDS.regionFooterBottom,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.FooterBottom,
              rootLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterBottom,
              status: footerBottomRegion.status,
              flags: footerBottomRegion.flags,
              visibilityMask: footerBottomRegion.visibilityMask,
              sortOrder: footerBottomRegion.sortOrder,
              config: {
                ...footerBottomRegion.config,
                ...(typeof shellFooterBottomHeight === "number"
                  ? { size: { ...(footerBottomRegion.config.size ?? {}), height: `${shellFooterBottomHeight}px` } }
                  : {}),
              },
            },
          ]
        : []),
    ],
    layoutNodes: [
      ...(headerTopRegion && includeHeaderTop
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderTop,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("three-column"), "three-column"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: -10,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub header top three column",
              config: {
                ...resolvePhiLayoutCreationPreset("threecol", "panel"),
                balancedSides: true,
              },
            },
          ]
        : []),
      {
        id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("three-column"), "three-column"),
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main three column",
        config: {
          ...resolvePhiLayoutCreationPreset("threecol", "panel"),
          balancedSides: false,
          justify: "space-between",
          contentAlign: "center",
        },
      },
      {
        id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderActions,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
        widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("flex"), "flex"),
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 20,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main actions",
        config: {
          ...resolvePhiLayoutCreationPreset("flex", "panel"),
          anchor: {
            horizontal: "right",
            vertical: "middle",
          },
          verticalSeparators: false,
          separatorBeforeFirst: true,
          separatorSpan: "50%",
          wrap: false,
          paddingLeft: 0,
          paddingRight: 0,
        },
      },
      ...(headerBottomRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderBottom,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("flex"), "flex"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 10,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub header bottom flex",
              config: {
                anchor: {
                  horizontal: "left",
                  vertical: "middle",
                },
                gap: 0,
                wrap: false,
                style: { height: "100%", width: "100%" },
              },
            },
          ]
        : []),
      ...(siderRightRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutSiderRight,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("flex-vertical"), "flex-vertical"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 16,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub sider right vertical",
              config: {
                anchor: {
                  horizontal: "center",
                  vertical: "top",
                },
                gap: 0,
                style: { height: "100%", width: "100%" },
              },
            },
          ]
        : []),
      ...(footerTopRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterTop,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("flex"), "flex"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 25,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer top flex",
              config: {
                anchor: {
                  horizontal: "right",
                  vertical: "middle",
                },
                gap: PHI_PADDING.md,
                paddingInline: PHI_PADDING.lg,
                paddingBlock: PHI_PADDING.sm,
                wrap: true,
                style: { width: "100%" },
              },
            },
          ]
        : []),
      ...(footerMainRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("three-column"), "three-column"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 30,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer main three column",
              config: {
                ...resolvePhiLayoutCreationPreset("threecol", "panel"),
                balancedSides: true,
                align: "stretch",
                justify: "space-between",
                paddingTop: PHI_PADDING.base,
                paddingBottom: PHI_PADDING.base,
                style: { minHeight: "96px" },
              },
            },
          ]
        : []),
      ...(footerBottomRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterBottom,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("flex"), "flex"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 40,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer bottom flex",
              config: {
                anchor: {
                  horizontal: "center",
                  vertical: "middle",
                },
                gap: PHI_PADDING.md,
                padding: `${PHI_PADDING.md}px ${PHI_PADDING.lg}px`,
                wrap: true,
                style: { minHeight: "48px", width: "100%" },
              },
            },
          ]
        : []),
    ],
    contentWidgets: [
      ...(headerTopRegion && includeHeaderTop
        ? [
            /*
             * The Brand's own two lines, drawn by the Brand Widget rather than copied into a Text one.
             *
             * They say what the Site says about itself, so they are read from the Theme record when the
             * page renders and are set where the rest of the Brand is set, in the Theme workspace. A
             * Site that has stated neither shows neither: the strip keeps its shape, and an invented
             * slogan in everybody's header was never this Preset's to write.
             */
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetHeaderTopLeft,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderTop,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: 1,
              flags: PhiCmsFlags.NoTranslate,
              visibilityMask: page.visibilityMask,
              label: "pub header top left",
              config: {
                mode: "line",
                line: "slogan",
              },
              contentId: null,
            },
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetHeaderTopMiddle,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderTop,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 10,
              status: 1,
              flags: PhiCmsFlags.NoTranslate,
              visibilityMask: page.visibilityMask,
              label: "pub header top middle",
              config: {
                mode: "line",
                line: "location",
              },
              contentId: null,
            },
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetHeaderTopRight,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderTop,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("simple-text"), "simple-text"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 20,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub header top right",
              config: {
                text: contactLabel,
                href: contactHref,
                icon: contactIcon,
              },
              contentId: null,
            },
          ]
        : []),
      {
        id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetBrand,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
        widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main brand",
        /* What it says is the Widget's to resolve: the Theme's Wordmark, else this Site's name. */
        config: {},
        contentId: null,
      },
      {
        id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetNav,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
        widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("header-navigation"), "header-navigation"),
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 10,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main navigation",
        config: {
          navKey: `${navigationArea}:header`,
        },
        contentId: null,
      },
      {
        id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetLocale,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderActions,
        widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("locale"), "locale"),
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main locale",
        config: {},
        contentId: null,
      },
      /*
       * The account trigger, in every Area that shares this preset.
       *
       * Admin, Editor and Builder have carried one all along; App and Public did not. The Widget has a
       * guest state and shows the way in, so an anonymous header is the one place it earns its keep
       * most: without it a visitor has to find `/login` on their own, and somebody who did sign in has
       * no way back to their own account from the Public side.
       */
      {
        id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetAccount,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderActions,
        widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("account"), "account"),
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 20,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main account",
        config: {},
        contentId: null,
      },
      ...(footerMainRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterLeft,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: 1,
              flags: PhiCmsFlags.NoTranslate,
              visibilityMask: page.visibilityMask,
              label: "pub footer main left",
              config: {
                showLogo: false,
              },
              contentId: null,
            },
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterMiddle,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("quick-links"), "quick-links"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 10,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer main quick links",
              config: {
                title: defaultQuickLinksTitle,
                navKey: `${navigationArea}:footer`,
                columns: 2,
                separator: true,
              },
              contentId: null,
            },
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterRight,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("simple-text"), "simple-text"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 20,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer main right",
              config: {
                text: contactLabel,
                href: contactHref,
                icon: contactIcon,
              },
              contentId: null,
            },
          ]
        : []),
      ...(footerBottomRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterBottomText,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterBottom,
              widgetType: buildPhiCmsWidgetTypeKey(resolvePhiCmsWidgetPluginKey("simple-text"), "simple-text"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer bottom text",
              config: {
                text: footerBottomText,
                type: "secondary",
              },
              contentId: null,
            },
          ]
        : []),
    ],
  };
}
