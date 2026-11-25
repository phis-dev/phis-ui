import { createPhiPresetCmsInstanceIdMap } from "../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../../types";
import type { PhiBuilderAreaKey } from "../../constants/cms-areas";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsRegionType } from "../../constants/phi-cms";
import { resolvePhiCmsWidgetPluginKey } from "../../constants/cms-widget-types";
import { buildPhiCmsLayoutNamespacedTypeKey } from "../../constants/cms-layout-types";
import { resolvePhiCmsLayoutPluginKey } from "../../constants/cms-layout-type-keys";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../types/cms";
import type { PhiBlockRuntime } from "../../types";
import { PHI_TEXT_SOURCE_PRESET } from "../../helpers/text-source";
import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import { buildPhiCmsWidgetNamespacedTypeKey } from "../../constants/cms-widget-types";
import { createPhiCmsPresetNodes } from "../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight, resolvePhiShellMetric } from "../../helpers/shell-region-style";
import { resolvePhiLayoutCreationPreset } from "../../helpers/cms-layout-defaults";
import { PHI_DEFAULT_PUB_AREA_PRESET } from "./pub-area-preset";
import {
  PHI_DEFAULT_PUB_AREA_LAYOUT_NODE_KEYS,
  PHI_DEFAULT_PUB_AREA_WIDGET_NODE_KEYS,
} from "./preset-contracts/pub-area";

const SYNTHETIC_REGION_IDS = {
  regionHeaderMain: -2,
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
  const isApp = runtimeModuleArea === "app";
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
  const headerMainRegion = PHI_DEFAULT_PUB_AREA_PRESET.regions.find(
    (region) => region.key === "header_main",
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
  /*
   * The Preset's words stay in the source language and say they are the Preset's; the Widgets translate
   * them through the global store (`helpers/text-source.ts`).
   *
   * The Footer's right column is left empty. It used to hold a mailto link to whoever runs the Site,
   * which the Site's own contact page (`/contact`, with its Form) and the App's Support have replaced.
   */
  /*
   * A template rather than a finished sentence, and left untranslated here.
   *
   * The Widget translates what it holds and fills the names in afterwards, which is the only order in
   * which a Site adopting this Preset keeps a copyright line that is about itself: resolving them here
   * wrote this Site's name and the year of the adoption into everybody's footer, where they stayed.
   * `helpers/text-placeholders.ts` has the names it may use.
   */
  const footerBottomText = "© {year} {site.name}. All rights reserved.";
  const shellHeaderMainHeight = resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main");
  const shellHeaderMainOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "header",
    region: "main",
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
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page,
    overlays: [],
    regions: [
      ...(headerMainRegion
        ? [
            nodes.region({
              id: SYNTHETIC_REGION_IDS.regionHeaderMain,
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
            }),
          ]
        : []),
      ...(footerTopRegion
        ? [
            nodes.region({
              id: SYNTHETIC_REGION_IDS.regionFooterTop,
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
            }),
          ]
        : []),
      ...(footerMainRegion
        ? [
            nodes.region({
              id: SYNTHETIC_REGION_IDS.regionFooterMain,
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
            }),
          ]
        : []),
      ...(footerBottomRegion
        ? [
            nodes.region({
              id: SYNTHETIC_REGION_IDS.regionFooterBottom,
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
            }),
          ]
        : []),
    ],
    layoutNodes: [
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
          // Three equal columns in every Area: the middle (navigation or page title) never needs more than a third.
          balancedSides: true,
          sideShare: 33,
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
                paddingTop: PHI_SPACE.sm,
                paddingRight: PHI_SPACE.lg,
                paddingBottom: PHI_SPACE.sm,
                paddingLeft: PHI_SPACE.lg,
                wrap: true,
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
                paddingTop: PHI_SPACE.base,
                paddingBottom: PHI_SPACE.base,
                minSize: { height: 96 },
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
              widgetType: buildPhiCmsLayoutNamespacedTypeKey(resolvePhiCmsLayoutPluginKey("three-column"), "three-column"),
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 40,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer bottom three column",
              /*
               * 20 : 60 : 20, the copyright line in the middle. The sides stand empty for a Site to fill;
               * on a phone empty sides take nothing and the middle the whole row (LAYOUTING.md).
               */
              config: {
                ...resolvePhiLayoutCreationPreset("threecol", "panel"),
                balancedSides: true,
                sideShare: 20,
                contentAlign: "center",
                paddingTop: PHI_SPACE.sm,
                paddingRight: PHI_SPACE.base,
                paddingBottom: PHI_SPACE.sm,
                paddingLeft: PHI_SPACE.base,
                minSize: { height: 48 },
              },
            },
          ]
        : []),
    ],
    contentWidgets: [
      {
        id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetBrand,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
        widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main brand",
        /* What it says is the Widget's to resolve: the Theme's Wordmark, else this Site's name. */
        config: {},
        contentVersionId: null,
      },
      isApp
        ? nodes.widget({
            typeKey: "page-title",
            id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetPageTitle,
            parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
            slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
            sortOrder: 10,
            label: "Page title",
            config: { display: "label" },
          })
        : {
            id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetNav,
            siteId: page.siteId,
            parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderMain,
            widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("header-navigation"), "header-navigation"),
            slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
            sortOrder: 10,
            status: 1,
            flags: 0,
            visibilityMask: page.visibilityMask,
            label: "pub header main navigation",
            /* The current entry on a rounded ground rather than a bar under it, in either mode. */
            config: {
              navKey: `${runtimeModuleArea}:header`,
              selectionStyle: "pill",
            },
            contentVersionId: null,
          },
      // The magnifier leads to this Area's results Page wherever the Search Module is active.
      ...(runtimeModuleArea === "public" || isApp
        ? [{
            id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetSearch,
            siteId: page.siteId,
            parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderActions,
            widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("search-box"), "search-box"),
            slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
            sortOrder: 5,
            status: 1,
            flags: 0,
            visibilityMask: page.visibilityMask,
            label: "pub header main search",
            config: { variant: "icon-only" },
            contentVersionId: null,
          }]
        : []),
      ...(!isApp ? [{
          id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetLocale,
          siteId: page.siteId,
          parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutHeaderActions,
          widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("locale"), "locale"),
          slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
          sortOrder: 10,
          status: 1,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: "pub header main locale",
          config: {},
          contentVersionId: null,
        }] : []),
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
        widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("account"), "account"),
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[isApp ? 1 : 2].slotIndex,
        sortOrder: 20,
        status: 1,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub header main account",
        config: {},
        contentVersionId: null,
      },
      ...(footerMainRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterLeft,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: 1,
              flags: PhiCmsFlags.NoTranslate,
              visibilityMask: page.visibilityMask,
              label: "pub footer main left",
              config: {
                mode: "wordmark",
              },
              contentVersionId: null,
            },
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterMiddle,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterMain,
              widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("quick-links"), "quick-links"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 10,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer main quick links",
              config: {
                title: "Quick Links",
                textSource: PHI_TEXT_SOURCE_PRESET,
                navKey: `${runtimeModuleArea}:footer`,
                columns: 2,
                separator: true,
              },
              contentVersionId: null,
            },
          ]
        : []),
      ...(footerBottomRegion
        ? [
            {
              id: PHI_DEFAULT_PUB_AREA_WIDGET_IDS.widgetFooterBottomText,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_DEFAULT_PUB_AREA_LAYOUT_IDS.layoutFooterBottom,
              widgetType: buildPhiCmsWidgetNamespacedTypeKey(resolvePhiCmsWidgetPluginKey("simple-text"), "simple-text"),
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 0,
              status: 1,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub footer bottom text",
              config: {
                text: footerBottomText,
                textSource: PHI_TEXT_SOURCE_PRESET,
                tone: "secondary",
              },
              contentVersionId: null,
            },
          ]
        : []),
    ],
  };
}
