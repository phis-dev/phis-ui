import {
  createPhiPresetCmsInstanceIdMap,
  type PhiCmsInstanceId,
} from "../../../types/cms-instance-id";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PhiMediaKind } from "../../../constants/media";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { remapPhiSignalRoutesInConfig } from "../../../helpers/signal-route-lifecycle";
import { resolvePhiBrandWordmarkText } from "../../../helpers/brand-wordmark";
import { resolvePhiShellMetric } from "../../../helpers/shell-region-style";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../../../types/cms-module-descriptors";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
  type PhiBlockRuntime,
} from "../../../types";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import {
  createPhiSiteThemeSelectionValue,
  resolvePhiThemeSelectionValue,
} from "../../../theme/phi-theme-selection";
import { createPhiBuilderControllerAddress } from "../../../plugins/runtime-modules/builder/controller/address";
import { createPhiThemeControllerAddress } from "../../../plugins/runtime-modules/theme/controller/address";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCoreRuntimeControllerAddress } from "../../runtime/core-runtime-controller-address";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/asset/ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/builder/ids";
import { PHI_BUILDER_NAVIGATION_DND_TYPE_PAGE } from "../../../constants/builder-navigation-dnd";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";
import { getPhiBuilderChromeWidgetLabels } from "../../widgets/label-sets/builder-chrome";
import { getPhiSignalsWidgetLabels } from "../../widgets/label-sets/signals";
import { getPhiInspectorWidgetLabels } from "../../widgets/label-sets/inspector";
import { PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS } from "../../widgets/label-types/builder-chrome";
import type { PhiBuilderChromeWidgetLabels } from "../../widgets/label-types/builder-chrome";
import type { PhiInspectorWidgetLabels } from "../../widgets/label-types/inspector";
import { getPhiBuilderRevisionsWidgetLabels } from "../../widgets/label-sets/revisions";
import { getPhiBuilderModulesPageLabels } from "../../widgets/label-sets/builder-modules";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/revisions/ids";
import { createPhiRevisionsControllerAddress } from "../../../plugins/runtime-modules/revisions/controller/address";
import {
  PHI_BUILDER_PAGE_META_LAYOUT_IDS,
  PHI_BUILDER_PAGE_META_OVERLAY_IDS,
  PHI_BUILDER_PAGE_META_WIDGET_IDS,
  PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID,
  PHI_BUILDER_MODULES_TABLE_WIDGET_ID,
  PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS,
  PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS,
  PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS,
} from "../../../helpers/cms-page-addresses";
import { PHI_BUILDER_PAGE_META_FORM_ID } from "../../../plugins/runtime-modules/builder/page-meta-form";
import { PHI_BUILDER_EFFECTS_FORM_IDS } from "../../../plugins/runtime-modules/builder/page-meta-form";
import { PHI_BUILDER_SIGNAL_WIRING_FORM_ID } from "../../../plugins/runtime-modules/builder/signal-wiring-form";
import { getPhiBuilderNavigationPageLabels } from "./builder-navigation-label-set";
import { PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS, PHI_BUILDER_INSPECTOR_LAYOUT_IDS, PHI_BUILDER_INSPECTOR_OVERLAY_IDS, PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS, PHI_BUILDER_INSPECTOR_WIDGET_IDS } from "../../../plugins/runtime-modules/builder/inspector-overlay-addresses";
import { PHI_BUILDER_EFFECTS_SECTIONS } from "../../../plugins/runtime-modules/builder/effects-form-values";
import { getPhiMediaWidgetLabels } from "../../media/label-sets/media";
import {
  PHI_ASSET_INSPECTOR_LAYOUT_IDS,
  PHI_ASSET_INSPECTOR_OVERLAY_IDS,
  PHI_ASSET_INSPECTOR_WIDGET_IDS,
  PHI_ASSET_MEDIA_PAGE_WIDGET_IDS,
} from "../../media/asset-inspector-addresses";
import { PHI_ASSET_FOLDER_FORM_ID, PHI_ASSET_METADATA_FORM_ID } from "../../media/asset-metadata-form";
import { createPhiAssetControllerAddress } from "../../media/asset-controller-address";
import { createPhiRuntimeFormControllerAddress } from "../../forms/runtime-form-controller-address";

const PHI_BUILDER_INSPECTOR_SECTIONS = {
  region: [
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionGeometry, "builder-region-geometry-inspector", "geometry"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionViewport, "builder-region-viewport-inspector", "viewport"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionPadding, "builder-region-padding-inspector", "padding"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionBackground, "builder-region-background-inspector", "background"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionBorder, "builder-region-border-inspector", "border"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionShadow, "builder-region-shadow-inspector", "shadow"],
  ],
  layout: [
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutSettings, "builder-layout-settings-inspector", "settings"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutAnchor, "builder-layout-anchor-inspector", "anchor"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutViewport, "builder-layout-viewport-inspector", "viewport"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutBackground, "builder-layout-background-inspector", "background"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutBorder, "builder-layout-border-inspector", "border"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutShadow, "builder-layout-shadow-inspector", "shadow"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutChrome, "builder-layout-fields-inspector", "layoutFields"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutSignals, "builder-layout-signals-inspector", "signals"],
  ],
  widget: [
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetSettings, "builder-widget-settings-inspector", "settings"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetGeometry, "builder-widget-geometry-inspector", "geometry"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetViewport, "builder-widget-viewport-inspector", "viewport"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetSignals, "builder-widget-signals-inspector", "signals"],
  ],
} as const;

function resolveBuilderInspectorSectionTitle(
  labels: PhiInspectorWidgetLabels,
  sectionKey: keyof PhiInspectorWidgetLabels["sections"],
) {
  return labels.sections[sectionKey];
}

const SYNTHETIC_DEV_REGION_IDS = {
  regionHeaderTop: -509,
  regionHeaderMain: -510,
  regionHeaderBottom: -511,
  regionSiderLeft: -512,
  regionContent: -513,
  regionFooterMain: -514,
} as const;

const PHI_BUILDER_LAYOUT_NODE_KEYS = [
  "layoutHeaderTop",
  "layoutHeaderMain",
  "layoutHeaderBottom",
  "layoutHeaderTopActions",
  "layoutHeaderMainRightActions",
  "layoutSiderLeft",
  "layoutContent",
  "layoutFooterMain",
  "layoutBrandControlsHeader",
  "layoutBrandStack",
  "layoutBrandCardsRow",
  "layoutBrandStylePanel",
  "layoutWorkspaceHeader",
] as const;

const SYNTHETIC_DEV_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
}, PHI_BUILDER_LAYOUT_NODE_KEYS);

const PHI_BUILDER_WIDGET_NODE_KEYS = [
  "widgetToolbar",
  "widgetDraftStatus",
  "widgetStructureSiderFullHeightSwitch",
  "widgetSidebarNav",
  "widgetCanvas",
  "widgetNavigationItems",
  "widgetNavigationSource",
  "widgetFooterMainText",
  "widgetBuilderAreaSelector",
  "widgetAreaRootRoute",
  "widgetBuilderModeSwitch",
  "widgetHeaderMainDebugSwitch",
  "widgetHeaderTopThemeModeSwitch",
  "widgetHeaderTopAreaMenu",
  "widgetHeaderTopAccount",
  "widgetBuilderPageTitle",
  "widgetMediaQuery",
  "widgetMediaRefresh",
  "widgetPagesHeaderTitle",
  "widgetPagesMetaToolbar",
  "widgetPagesHeaderSelector",
  "widgetRevisionsTable",
  "widgetBrandContextSelect",
  "widgetBrandPreviewModeSwitch",
  "widgetBrandThemeControls",
  "widgetBrandThemePreview",
  "widgetThemeStackSegmented",
  "widgetBrandStyleControls",
  "widgetBrandStylePreview",
] as const;

const SYNTHETIC_DEV_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
}, PHI_BUILDER_WIDGET_NODE_KEYS);

const PHI_BUILDER_THEME_STACK_SIGNAL_KEY = "builder-theme-stack";

function resolveBuilderPageTitle(
  labels: PhiBuilderChromeWidgetLabels,
  pageKey: string,
  fallbackTitle: string,
) {
  if (pageKey in labels.pageTitles) {
    return labels.pageTitles[pageKey as keyof PhiBuilderChromeWidgetLabels["pageTitles"]];
  }

  return fallbackTitle;
}

function resolveBuilderPageTitleSource(pageKey: string) {
  if (pageKey in PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles) {
    return PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.pageTitles[
      pageKey as keyof PhiBuilderChromeWidgetLabels["pageTitles"]
    ];
  }
  return pageKey
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") || pageKey;
}

function buildBuilderCommandToolbarConfig(
  receiver = createPhiBuilderControllerAddress(),
) {
  return {
    key: "builder-command-toolbar",
    signalRoutes: {
      emits: [
        {
          routeKey: "builder-toolbar-command",
          capabilityId: "command",
          scope: "area",
          channel: "command",
          action: "activate",
          valueType: "string",
          receiver,
        },
      ],
      listens: [
        {
          routeKey: "builder-toolbar-undo-enabled",
          capabilityId: "enabled",
          scope: "area",
          channel: "enabled",
          action: "change",
          valueType: "boolean",
          receiver: createPhiSignalSubcontrolAddress(
            "cms",
            SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
            "undo",
          ),
        },
        {
          routeKey: "builder-toolbar-redo-enabled",
          capabilityId: "enabled",
          scope: "area",
          channel: "enabled",
          action: "change",
          valueType: "boolean",
          receiver: createPhiSignalSubcontrolAddress(
            "cms",
            SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
            "redo",
          ),
        },
      ],
    },
    compact: true,
    wrap: false,
    showLabels: false,
    buttons: [
      { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", buttonType: "default" },
      { key: "preview", emits: [{ capabilityId: "command", value: "preview" }], actionKey: "livePreview" },
      { key: "publish", emits: [{ capabilityId: "command", value: "publish" }], actionKey: "publish", buttonType: "default" },
      { key: "undo", emits: [{ capabilityId: "command", value: "undo" }], actionKey: "undo" },
      { key: "redo", emits: [{ capabilityId: "command", value: "redo" }], actionKey: "redo" },
      { key: "reset", emits: [{ capabilityId: "command", value: "reset" }], actionKey: "reset" },
    ],
  };
}

function remapBuilderPresetTreeInstanceIds(
  tree: PhiResolvedCmsPageTree,
  ownerModuleId: PhiRuntimeModuleId,
  presetKey: string,
) {
  const nextLayoutIds = createPhiPresetCmsInstanceIdMap({
    domain: "area",
    ownerModuleId,
    presetKey,
  }, PHI_BUILDER_LAYOUT_NODE_KEYS);
  const nextWidgetIds = createPhiPresetCmsInstanceIdMap({
    domain: "area",
    ownerModuleId,
    presetKey,
  }, PHI_BUILDER_WIDGET_NODE_KEYS);
  const instanceIdRemaps = new Map<PhiCmsInstanceId, PhiCmsInstanceId>();

  for (const key of PHI_BUILDER_LAYOUT_NODE_KEYS) {
    instanceIdRemaps.set(SYNTHETIC_DEV_LAYOUT_IDS[key], nextLayoutIds[key]);
  }
  for (const key of PHI_BUILDER_WIDGET_NODE_KEYS) {
    instanceIdRemaps.set(SYNTHETIC_DEV_WIDGET_IDS[key], nextWidgetIds[key]);
  }

  const signalRemaps = [...instanceIdRemaps].map(([from, to]) => ({
    from: createPhiSignalAddress("cms", from),
    to: createPhiSignalAddress("cms", to),
  }));
  const remapInstanceId = (value: PhiCmsInstanceId | null) =>
    value == null ? null : (instanceIdRemaps.get(value) ?? value);

  return {
    ...tree,
    page: {
      ...tree.page,
      heroRootLayoutNodeId: remapInstanceId(tree.page.heroRootLayoutNodeId),
      headerBottomRootLayoutNodeId: remapInstanceId(tree.page.headerBottomRootLayoutNodeId),
      siderRightRootLayoutNodeId: remapInstanceId(tree.page.siderRightRootLayoutNodeId),
      footerTopRootLayoutNodeId: remapInstanceId(tree.page.footerTopRootLayoutNodeId),
      drawerRightRootLayoutNodeId: remapInstanceId(tree.page.drawerRightRootLayoutNodeId),
      contentRootLayoutNodeId: remapInstanceId(tree.page.contentRootLayoutNodeId),
    },
    regions: tree.regions.map((region) => ({
      ...region,
      rootLayoutNodeId: remapInstanceId(region.rootLayoutNodeId)!,
    })),
    overlays: tree.overlays.map((overlay) => ({
      ...overlay,
      id: remapInstanceId(overlay.id)!,
      headerLayoutNodeId: remapInstanceId(overlay.headerLayoutNodeId),
      bodyLayoutNodeId: remapInstanceId(overlay.bodyLayoutNodeId)!,
      ...(overlay.footerPresentation === "none"
        ? { footerPresentation: "none" as const, footerLayoutNodeId: null }
        : {
            footerPresentation: overlay.footerPresentation,
            footerLayoutNodeId: remapInstanceId(overlay.footerLayoutNodeId)!,
          }),
      config: remapPhiSignalRoutesInConfig(overlay.config, signalRemaps),
    })),
    layoutNodes: tree.layoutNodes.map((node) => ({
      ...node,
      id: remapInstanceId(node.id)!,
      parentLayoutNodeId: remapInstanceId(node.parentLayoutNodeId),
      config: remapPhiSignalRoutesInConfig(node.config, signalRemaps),
    })),
    contentWidgets: tree.contentWidgets.map((node) => ({
      ...node,
      id: remapInstanceId(node.id)!,
      parentLayoutNodeId: remapInstanceId(node.parentLayoutNodeId)!,
      config: remapPhiSignalRoutesInConfig(node.config, signalRemaps),
    })),
  } satisfies PhiResolvedCmsPageTree;
}

export async function buildPhiDefaultBuilderAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labelOptions = {
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  };
  const [labels, inspectorLabels, signalsLabels] = await Promise.all([
    getPhiBuilderChromeWidgetLabels(labelOptions),
    getPhiInspectorWidgetLabels(labelOptions),
    getPhiSignalsWidgetLabels(labelOptions),
  ]);
  const builderPageTitleSource = resolveBuilderPageTitleSource("dashboard");
  const builderPageTitle = resolveBuilderPageTitle(
    labels,
    "dashboard",
    builderPageTitleSource,
  );
  const shellSiderLeftWidth = resolvePhiShellMetric(runtime.site.theme?.shell, "width", {
    family: "sider",
    region: "left",
  });
  const footerMainText = `© ${new Date().getUTCFullYear()} ${resolvePhiBrandWordmarkText(runtime)}. All rights reserved.`;

  return {
    page: {
      ...page,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: {
        msgId: 0,
        source: builderPageTitleSource,
        value: builderPageTitle,
      },
      description: null,
    },
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("builder"),
    overlays: [
      ...([
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody, "Region inspector", "region"],
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody, "Layout inspector", "layout"],
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.widgetInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody, "Widget inspector", "widget"],
    ] as const).map(([id, headerLayoutNodeId, bodyLayoutNodeId, title, view], index) => ({
      id,
      overlayType: "drawer" as const,
      headerLayoutNodeId,
      bodyLayoutNodeId,
      footerPresentation: "none" as const,
      footerLayoutNodeId: null,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: index,
      label: title,
      config: {
        title: null,
        placement: "right",
        size: 377,
        mountPolicy: "keep-alive",
        effect: "glass",
        mask: {
          appearance: "transparent",
          allowOutsideInteraction: false,
          closable: true,
        },
        signalRoutes: {
          emits: [{ routeKey: `builder-${view}-inspector-visibility`, capabilityId: "openChange", scope: "area", channel: "inspectorVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() }],
          listens: [
            { routeKey: `builder-${view}-inspector-open`, capabilityId: "open", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
            { routeKey: `builder-${view}-inspector-close`, capabilityId: "close", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
          ],
        },
      },
      })),
      {
        id: PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor,
        overlayType: "modal" as const,
        headerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        bodyLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 10,
        label: "Builder effects",
        config: {
          title: "Effects",
          controlSize: "medium",
          mountPolicy: "eager",
          closeMode: "request",
          signalRoutes: {
            emits: [
              { routeKey: "builder-effects-visibility", capabilityId: "openChange", scope: "area", channel: "effectsVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() },
              { routeKey: "builder-effects-close-request", capabilityId: "closeRequest", scope: "area", channel: "effects", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest, receiver: createPhiBuilderControllerAddress() },
            ],
            listens: [
              { routeKey: "builder-effects-open", capabilityId: "open", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor) },
              { routeKey: "builder-effects-close", capabilityId: "close", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor) },
            ],
          },
        },
      },
      {
        /*
         * Signal wiring. The Modal, its Form and its footer actions are declared here rather than built
         * as a React Modal of its own -- the wiring surface predates the overlay contract and was dropped
         * during the overlay consolidation because of it.
         */
        id: PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 11,
        label: "Builder signal wiring",
        config: {
          title: signalsLabels.routes.modalTitle,
          controlSize: "medium",
          mountPolicy: "eager",
          closeMode: "request",
          signalRoutes: {
            emits: [
              { routeKey: "builder-signal-wiring-visibility", capabilityId: "openChange", scope: "area", channel: "signalWiringVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() },
              { routeKey: "builder-signal-wiring-close-request", capabilityId: "closeRequest", scope: "area", channel: "signalWiring", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest, receiver: createPhiBuilderControllerAddress() },
            ],
            listens: [
              { routeKey: "builder-signal-wiring-open", capabilityId: "open", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring) },
              { routeKey: "builder-signal-wiring-close", capabilityId: "close", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring) },
            ],
          },
        },
      },
    ],
    regions: [
      {
        id: SYNTHETIC_DEV_REGION_IDS.regionHeaderTop,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderTop,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: -10,
        config: {
          mode: runtime.site.theme?.mode ?? "dark",
          sticky: false,
          effect: "glass",
          shadow: "none",
          border: false,
          size: { height: "55px" },
          offsetTop: 0,
        },
      },
      {
        id: SYNTHETIC_DEV_REGION_IDS.regionHeaderMain,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderMain,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 0,
        config: {
          mode: runtime.site.theme?.mode ?? "dark",
          sticky: true,
          effect: "glass",
          shadow: "none",
          border: false,
          size: { height: "55px" },
          offsetTop: 0,
        },
      },
      {
        id: SYNTHETIC_DEV_REGION_IDS.regionSiderLeft,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.SiderLeft,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutSiderLeft,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 10,
        config: {
          mode: runtime.site.theme?.mode ?? "dark",
          sticky: true,
          fullHeight: true,
          collapsible: true,
          border: true,
          ...(typeof shellSiderLeftWidth === "number"
            ? { size: { width: `${shellSiderLeftWidth}px` } }
            : { size: { width: `${PHI_LAYOUT.sidebarWidth}px` } }),
          offsetTop: 0,
        },
      },
      {
        id: SYNTHETIC_DEV_REGION_IDS.regionFooterMain,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Footer,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutFooterMain,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          mode: runtime.site.theme?.mode ?? "dark",
          shadow: "none",
          border: false,
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev header top three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev header main three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      buildPhiCmsLayoutNode({
        typeKey: "flex",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev header top actions",
        config: {
          anchor: { horizontal: "right", vertical: "middle" },
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
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutSiderLeft,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev sider left flex",
        config: {
          anchor: { horizontal: "center", vertical: "top" },
          gap: 0,
          maxWidth: "100%",
          margin: 0,
          padding: PHI_SPACE.xs,
          paddingTop: 0,
        },
      }),
      buildPhiCmsLayoutNode({
        typeKey: "content",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutFooterMain,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev footer main",
        config: { maxWidth: "100%", margin: 0, padding: 0 },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMainRightActions,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev header main right actions",
        config: {
          gap: PHI_SPACE.sm,
          anchor: { horizontal: "right", vertical: "middle" },
          wrap: false,
          padding: 0,
          paddingLeft: 0,
          paddingRight: 0,
          background: "transparent",
          border: "none",
          borderRadius: 0,
        },
      }),
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader,
      ]] as const).map(([id]) => buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder inspector header",
        config: {
          anchor: { horizontal: "left", vertical: "middle" },
          gap: PHI_SPACE.sm,
          padding: 0,
          paddingLeft: PHI_SPACE.lg,
          background: "transparent",
          border: "none",
        },
      })),
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.region,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.layout,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.widget,
      ]] as const).map(([id, sections]) => buildPhiCmsLayoutNode({
        typeKey: "collapsible",
        id,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder inspector sections",
        config: {
          ghost: true,
          bordered: false,
          padding: PHI_SPACE.sm,
          innerPadding: PHI_SPACE.sm,
          slotTitles: sections.map(([, , sectionKey]) =>
            resolveBuilderInspectorSectionTitle(inspectorLabels, sectionKey)
          ),
          defaultOpenSlotKeys: ["slot_0"],
        },
      })),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects header",
        config: { anchor: { horizontal: "center", vertical: "middle" }, gap: 0, padding: 0, width: "100%", background: "transparent", border: "none" },
      }),
      buildPhiCmsLayoutNode({
        typeKey: "stack",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects body",
        config: { mountPolicy: "keep", slotTransition: "fade-over", defaultActiveSlotKey: "slot_0", padding: PHI_SPACE.base, width: "100%", background: PHI_COLOR.bgLayout, border: "none" },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects footer",
        config: {},
      }),
      buildPhiCmsLayoutNode({
        /*
         * The creation preset has to name the Layout's OWN kind. The horizontal Flex panel preset sets
         * `paddingTop: 0` and `paddingBottom: 0` -- right for a row of controls, wrong for a column --
         * and those per-side values outrank the scalar `padding` below, which is how the wiring body
         * ended up with side padding only.
         */
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder signal wiring body",
        config: { gap: PHI_SPACE.sm, padding: PHI_SPACE.base, width: "100%", background: "transparent", border: "none" },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder signal wiring footer",
        config: {},
      }),
    ],
    contentWidgets: [
      ...([[
        PHI_BUILDER_INSPECTOR_WIDGET_IDS.regionInspectorHeaderWidget,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_WIDGET_IDS.layoutInspectorHeaderWidget,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_WIDGET_IDS.widgetInspectorHeaderWidget,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader,
      ]] as const).map(([id, parentLayoutNodeId]) => buildPhiCmsWidgetNode({
        typeKey: "builder-inspector-header",
        id,
        siteId: page.siteId,
        parentLayoutNodeId,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder inspector header",
        config: {},
        contentId: null,
      })),
      buildPhiCmsWidgetNode({
        typeKey: "select-box",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderAreaSelector,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev builder area selector",
        config: {
          key: "builder-area-selector",
          value: "public",
          options: [
            { value: "public", label: "Public" },
            { value: "app", label: "App" },
            { value: "admin", label: "Admin" },
            { value: "builder", label: "Builder" },
            { value: "editor", label: "Editor" },
            { value: "accounting", label: "Accounting" },
          ],
          signalRoutes: {
            emits: [{ routeKey: "builder-area-change", capabilityId: "change", scope: "area", channel: "area", action: "change", valueType: "string", receiver: createPhiBuilderControllerAddress() }],
            listens: [{ routeKey: "builder-area-selection", capabilityId: "change", scope: "area", channel: "areaSelection", action: "change", valueType: "string", receiver: createPhiSignalAddress("cms", SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderAreaSelector) }],
          },
        },
        contentId: null,
      }),
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.region,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.layout,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.widget,
      ]] as const).flatMap(([parentLayoutNodeId, sections]) => sections.map(([id, typeKey, sectionKey], slotIndex) => buildPhiCmsWidgetNode({
        typeKey,
        id,
        siteId: page.siteId,
        parentLayoutNodeId,
        slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: `Builder ${resolveBuilderInspectorSectionTitle(inspectorLabels, sectionKey)}`,
        config: {
          signalRoutes: {
            emits: [{
              routeKey: `${typeKey}-change`,
              capabilityId: "change",
              scope: "area",
              channel: "inspector",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderInspector,
              receiver: createPhiBuilderControllerAddress(),
            }],
          },
        },
        contentId: null,
      }))),
      buildPhiCmsWidgetNode({
        typeKey: "tab-bar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsTabs,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects tabs",
        config: {
          key: "builder-effects-tabs",
          value: "0",
          valueMode: "stack-slot-index",
          controlSize: "small",
          signalRoutes: {
            emits: [
              { routeKey: "builder-effects-stack-meta-request", capabilityId: "stackMeta", scope: "area", channel: "stackMeta", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody) },
              { routeKey: "builder-effects-stack-slot-change", capabilityId: "activeSlotIndex", scope: "area", channel: "activeSlotIndex", action: "change", valueType: "number", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody) },
            ],
            listens: [
              { routeKey: "builder-effects-stack-meta-response", capabilityId: "stackMeta", scope: "area", channel: "stackMeta", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta, receiver: "broadcast" },
            ],
          },
        },
        contentId: null,
      }),
      ...PHI_BUILDER_EFFECTS_SECTIONS.map((section, slotIndex) => {
        const id = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
        return buildPhiCmsWidgetNode({
          typeKey: "form",
          id,
          siteId: page.siteId,
          parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
          slotIndex,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: section === "appearance" ? "Appearance" : section === "transitions" ? "Transitions" : "Viewport",
          config: {
            formId: PHI_BUILDER_EFFECTS_FORM_IDS[section],
            formConfig: {},
            execution: { mode: "signal" },
            source: null,
            signalRoutes: {
              emits: [
                { routeKey: `builder-effects-${section}-values`, capabilityId: "submitValues", scope: "area", channel: `effectsForm:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() },
                { routeKey: `builder-effects-${section}-validation`, capabilityId: "validationFailed", scope: "area", channel: `effectsFormValidation:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity, receiver: createPhiBuilderControllerAddress() },
              ],
              listens: [
                { routeKey: `builder-effects-${section}-submit-form`, capabilityId: "submit", scope: "area", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
                { routeKey: `builder-effects-${section}-reset-form`, capabilityId: "reset", scope: "area", channel: "reset", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
              ],
            },
          },
          contentId: null,
        });
      }),
      buildPhiCmsWidgetNode({
        typeKey: "command-toolbar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects commands",
        config: {
          key: "builder-effects-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", buttonType: "default" },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{ routeKey: "builder-effects-command", capabilityId: "command", scope: "area", channel: "effects", action: "activate", valueType: "string", receiver: createPhiBuilderControllerAddress() }],
            listens: [{
              routeKey: "builder-effects-save-loading",
              capabilityId: "loading",
              scope: "area",
              channel: "effectsSubmitting",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
            }],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Signal wiring",
        config: {
          formId: PHI_BUILDER_SIGNAL_WIRING_FORM_ID,
          formConfig: {},
          execution: { mode: "signal" },
          source: null,
          signalRoutes: {
            emits: [
              { routeKey: "builder-signal-wiring-values", capabilityId: "submitValues", scope: "area", channel: "signalWiringForm", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() },
              { routeKey: "builder-signal-wiring-validation", capabilityId: "validationFailed", scope: "area", channel: "signalWiringFormValidation", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity, receiver: createPhiBuilderControllerAddress() },
            ],
            listens: [
              { routeKey: "builder-signal-wiring-submit-form", capabilityId: "submit", scope: "area", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm) },
              { routeKey: "builder-signal-wiring-reset-form", capabilityId: "reset", scope: "area", channel: "reset", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm) },
            ],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "table",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        // The vertical Flex Layout has sequential slots: one child per slot, so the Table takes the slot
        // after the Form rather than sharing its own. Sharing one displaced the Form entirely, and with
        // it the Form instance the overlay waits for before it opens.
        slotIndex: 1,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Signal routes",
        config: {
          /*
           * Deliberately queried WITHOUT the provider's session key: these rows are the routes the block
           * actually carries, read from the draft config, not a staged copy. The wiring Form writes
           * directly, so a staging session would only be a second truth to keep in step.
           */
          source: {
            providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalRoutesTable,
            resourceKey: "signalRoutes",
          },
          initialQuery: { page: 1, pageSize: 20, filters: { direction: "emit" } },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "capabilityId", fieldKey: "capabilityId", title: signalsLabels.routes.capability, renderer: "code", sizing: { mode: "content" } },
              { key: "channel", fieldKey: "channel", title: signalsLabels.routes.channel, sizing: { mode: "content" } },
              { key: "action", fieldKey: "action", title: signalsLabels.routes.action, sizing: { mode: "content" } },
              { key: "valueType", fieldKey: "valueType", title: signalsLabels.routes.valueType, sizing: { mode: "content" } },
              { key: "receiver", fieldKey: "receiver", title: signalsLabels.routes.receiver, renderer: "code", sizing: { mode: "fill", minWidth: 220 } },
            ],
            /*
             * The empty state reuses the route vocabulary rather than inventing a sentence: this Widget
             * has no routes yet, which is a normal starting point and not an error.
             */
            emptyState: { title: signalsLabels.routes.title },
            controlSize: "small",
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: false },
            actions: {
              row: [{ key: "delete", label: signalsLabels.routes.delete, icon: "delete", display: "icon", execution: "signal" }],
            },
          },
          signalRoutes: {
            emits: [{
              routeKey: "builder-signal-wiring-route-action",
              capabilityId: "actionActivate",
              scope: "area",
              channel: "signalWiringRoutes",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiBuilderControllerAddress(),
            }],
            listens: [{
              routeKey: "builder-signal-wiring-routes-reload",
              capabilityId: "reload",
              scope: "area",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes),
            }],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "command-toolbar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder signal wiring commands",
        config: {
          key: "builder-signal-wiring-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: signalsLabels.routes.cancel, buttonType: "default" },
            /*
             * The primary action reads "Apply", not "Save": it commits one route into the draft, and the
             * Page is saved separately. `actionKey` still names `save` so the button keeps that icon and
             * its loading affordance.
             */
            { key: "apply", emits: [{ capabilityId: "command", value: "apply" }], actionKey: "save", label: signalsLabels.routes.apply, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{ routeKey: "builder-signal-wiring-command", capabilityId: "command", scope: "area", channel: "signalWiring", action: "activate", valueType: "string", receiver: createPhiBuilderControllerAddress() }],
            listens: [],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "page-title",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderPageTitle,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
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
        typeKey: "account",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopAccount,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: 1,
        sortOrder: 10,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Account",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "area-menu",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopAreaMenu,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Area menu",
        config: {},
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "switch",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderMainDebugSwitch,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMainRightActions,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Debug switch",
        config: {
          label: labels.themeSwitch.debug,
          defaultChecked: false,
          key: "debugScaffold",
          signalRoutes: {
            emits: [
              {
                routeKey: "header-debug-scaffold-change",
                capabilityId: "change",
                scope: "area",
                channel: "debugScaffold",
                action: "change",
                valueType: "boolean",
                receiver: "broadcast",
              },
            ],
          },
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "switch",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopThemeModeSwitch,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 1,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Theme mode switch",
        config: {
          defaultChecked: runtime.site.theme?.mode === "dark",
          checkedChildren: labels.themeSwitch.dark,
          unCheckedChildren: labels.themeSwitch.light,
          key: "themeMode",
          signalRoutes: {
            emits: [
              {
                routeKey: "builder-header-theme-mode-change",
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
        typeKey: "sidebar-navigation",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetSidebarNav,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Sidebar navigation",
        config: {
          side: "left",
          width: 224,
          navKey: "builder:sidebar",
        },
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "simple-text",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetFooterMainText,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutFooterMain,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "dev footer main text",
        config: { text: footerMainText, type: "secondary" },
        contentId: null,
      }),
    ],
  };
}

async function buildPhiDefaultBuilderPagePresetTemplateTree({
  page,
  runtime,
  registry,
  activeModuleKeys,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  registry: PhiCmsCompiledDescriptorCatalog;
  activeModuleKeys: ReadonlySet<string>;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const builderBasePath = "/builder";
  const isStructurePage = page.path === `${builderBasePath}/shells`;
  const isPagesPage = page.path === `${builderBasePath}/pages`;
  const isNavigationPage = page.path === `${builderBasePath}/navigation`;
  const isRevisionsPage = page.path === `${builderBasePath}/revisions`;
  const isModulesPage = page.path === `${builderBasePath}/modules`;
  const isMediaPage = page.path === `${builderBasePath}/media`;
  const isThemePage = page.path === `${builderBasePath}/theme`;
  const revisionsLabels = isRevisionsPage ? await getPhiBuilderRevisionsWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  }) : null;
  const modulesLabels = isModulesPage ? await getPhiBuilderModulesPageLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  }) : null;
  const modulesDetailLabels = modulesLabels ? {
    moduleId: modulesLabels.detail.moduleId,
    title: modulesLabels.columns.title,
    description: modulesLabels.columns.description,
    category: modulesLabels.columns.category,
    eligibleAreas: modulesLabels.columns.eligibleAreas,
    baseModule: modulesLabels.detail.baseModule,
    active: modulesLabels.detail.active,
    yes: modulesLabels.detail.yes,
    no: modulesLabels.detail.no,
  } : null;
  const navigationLabels = isNavigationPage ? await getPhiBuilderNavigationPageLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  }) : null;
  const mediaLabels = isMediaPage ? await getPhiMediaWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  }) : null;
  const builderCommandToolbarConfig = buildBuilderCommandToolbarConfig(
    isThemePage
      ? createPhiThemeControllerAddress()
      : createPhiBuilderControllerAddress(),
  );
  const builderPageKey = page.path.replace(`${builderBasePath}/`, "") || "dashboard";
  const builderPageTitleSource = resolveBuilderPageTitleSource(builderPageKey);
  const builderPageTitle = resolveBuilderPageTitle(labels, builderPageKey, builderPageTitleSource);
  return {
    page: {
      ...page,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: {
        msgId: 0,
        source: builderPageTitleSource,
        value: builderPageTitle,
      },
      description: null,
    },
    overlays: [
      ...(isPagesPage ? [{
        id: PHI_BUILDER_PAGE_META_OVERLAY_IDS.editor,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.body,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.footer,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 0,
        label: "Builder page metadata",
        config: {
          title: labels.pages.pageMeta,
          width: { compact: "calc(100vw - 32px)", medium: 560, wide: 640 },
          mountPolicy: "keep-alive",
          closeMode: "immediate",
          signalRoutes: {
            emits: [{ routeKey: "builder-page-meta-visibility", capabilityId: "openChange", scope: "area", channel: "pageMetaVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() }],
            listens: [
              { routeKey: "builder-page-meta-open", capabilityId: "open", scope: "page", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_OVERLAY_IDS.editor) },
              { routeKey: "builder-page-meta-close", capabilityId: "close", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_OVERLAY_IDS.editor) },
              { routeKey: "builder-page-meta-title", capabilityId: "title", scope: "page", channel: "title", action: "change", valueType: "string", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_OVERLAY_IDS.editor) },
            ],
          },
        },
      }] : []),
      ...(isModulesPage ? [{
        id: PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS.overlayModuleDetail,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS.body,
        footerPresentation: "none" as const,
        footerLayoutNodeId: null,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 0,
        label: "Builder module detail",
        config: {
          title: modulesLabels?.detail.title ?? "Module details",
          width: { compact: "calc(100vw - 32px)", medium: 560, wide: 640 },
          mountPolicy: "keep-alive",
          closeMode: "immediate",
          signalRoutes: {
            listens: [
              { routeKey: "builder-module-detail-open", capabilityId: "open", scope: "page", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS.overlayModuleDetail) },
              { routeKey: "builder-module-detail-close", capabilityId: "close", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS.overlayModuleDetail) },
            ],
          },
        },
      }] : []),
      ...(isMediaPage ? [{
      id: PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaInspector,
      overlayType: "drawer" as const,
      headerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorHeader,
      bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
      footerPresentation: "actions" as const,
      footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorFooter,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 0,
      label: "Asset inspector",
      config: {
        title: mediaLabels?.inspector.inspectorTitle ?? "Asset inspector",
        placement: "right",
        size: 377,
        mountPolicy: "keep-alive",
        effect: "glass",
        background: "transparent",
        mask: {
          appearance: "transparent",
          allowOutsideInteraction: false,
          closable: true,
        },
        signalRoutes: {
          listens: [
            {
              routeKey: "builder-media-selection-open-inspector",
              capabilityId: "open",
              scope: "page",
              channel: "selection",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection,
              receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaInspector),
            },
            {
              routeKey: "builder-media-inspector-close",
              capabilityId: "close",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaInspector),
            },
          ],
        },
      },
    }, {
        id: PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFocalRect,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 1,
        label: "Asset focal rectangle",
        config: {
          title: mediaLabels?.editor.focalRectLabel ?? "Focal rectangle",
          controlSize: "large",
          centered: true,
          mountPolicy: "on-open",
          closeMode: "immediate",
          mask: {
            appearance: "normal",
            allowOutsideInteraction: false,
            closable: true,
          },
          signalRoutes: {
            listens: [
              {
                routeKey: "builder-media-focal-rect-open",
                capabilityId: "open",
                scope: "page",
                channel: "focalRectDialog",
                action: "open",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFocalRect),
              },
              {
                routeKey: "builder-media-focal-rect-close",
                capabilityId: "close",
                scope: "page",
                channel: "focalRectDialog",
                action: "close",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFocalRect),
              },
            ],
          },
        },
      }] : []),
      ...(isMediaPage ? [{
        id: PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFolderCreate,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 2,
        label: "Create asset folder",
        config: {
          title: mediaLabels?.editor.createFolderTitle ?? "Create folder",
          controlSize: "medium",
          width: { compact: "calc(100vw - 32px)", medium: 480, wide: 520 },
          centered: true,
          mountPolicy: "on-open",
          closeMode: "immediate",
          mask: {
            appearance: "normal",
            allowOutsideInteraction: false,
            closable: true,
          },
          signalRoutes: {
            listens: [
              {
                routeKey: "builder-media-folder-create-open",
                capabilityId: "open",
                scope: "page",
                channel: "dialog",
                action: "open",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFolderCreate),
              },
              {
                routeKey: "builder-media-folder-create-close",
                capabilityId: "close",
                scope: "page",
                channel: "dialog",
                action: "close",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFolderCreate),
              },
            ],
          },
        },
      }] : []),
    ],
    regions: [
      ...(isStructurePage || isPagesPage || isNavigationPage || isRevisionsPage || isMediaPage || isThemePage || isModulesPage
        ? [
            {
              id: SYNTHETIC_DEV_REGION_IDS.regionHeaderBottom,
              pageId: page.id,
              areaPresetId: null,
              regionType: PhiCmsRegionType.HeaderBottom,
              rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              sortOrder: 5,
              config: {
                mode: runtime.site.theme?.mode ?? "dark",
                sticky: true,
                effect: "glass",
                shadow: "soft",
                border: false,
                flags: isStructurePage ? PhiCmsFlags.Collapsed : 0,
                size: { height: "55px" },
                offsetTop: 55,
              },
            },
          ]
        : []),
      {
        id: SYNTHETIC_DEV_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 20,
        config: {
          maxSize: { width: "100%" },
          size: { width: "100%" },
          padding: 0,
          margin: 0,
        },
      },
    ],
    layoutNodes: [
      ...((isStructurePage || isPagesPage || isMediaPage || isNavigationPage || isRevisionsPage || isThemePage || isModulesPage)
        ? [
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev header bottom three column",
              config: isMediaPage
                ? {
                    balancedSides: false,
                    gap: PHI_SPACE.base,
                    leftWidth: 130,
                    rightWidth: 130,
                    style: { height: "100%" },
                  }
                : {
                    balancedSides: true,
                    contentAlign: "center",
                    style: { height: "100%" },
                  },
            }),
          ]
        : []),
      buildPhiCmsLayoutNode(
        isStructurePage || isPagesPage
          ? {
              creationPreset: { layoutKind: "verticalflex", preset: "panel" },
              typeKey: "flex-vertical",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev builder workspace vertical",
              config: {
                anchor: {
                  horizontal: "center",
                  vertical: "top",
                },
                gap: PHI_SPACE.base,
                maxWidth: "100%",
                width: "100%",
                margin: 0,
                padding: PHI_SPACE.base,
                background: PHI_COLOR.bgLayout,
                border: "none",
                borderRadius: 0,
              },
            }
          : isNavigationPage
            ? {
                creationPreset: { layoutKind: "flex", preset: "panel" },
                typeKey: "flex",
                id: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                siteId: page.siteId,
                parentLayoutNodeId: null,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev navigation content flex",
                config: {
                  anchor: {
                    horizontal: "left",
                    vertical: "top",
                  },
                  gap: PHI_SPACE.base,
                  wrap: true,
                  width: "100%",
                  maxWidth: "100%",
                  margin: 0,
                  padding: PHI_SPACE.base,
                  paddingTop: PHI_SPACE.base,
                  paddingBottom: PHI_SPACE.base,
                  background: PHI_COLOR.bgLayout,
                  border: "none",
                  borderRadius: 0,
                },
              }
          : isMediaPage
            ? {
                creationPreset: { layoutKind: "verticalflex", preset: "panel" },
                typeKey: "flex-vertical",
                id: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                siteId: page.siteId,
                parentLayoutNodeId: null,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev media content vertical",
                config: {
                  anchor: {
                    horizontal: "center",
                    vertical: "top",
                  },
                  gap: PHI_SPACE.base,
                  maxWidth: "100%",
                  margin: 0,
                  background: PHI_COLOR.bgLayout,
                  border: "none",
                  borderRadius: 0,
                },
              }
          : isThemePage
            ? {
                creationPreset: { layoutKind: "verticalflex", preset: "panel" },
                typeKey: "flex-vertical",
                id: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                siteId: page.siteId,
                parentLayoutNodeId: null,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev brand content vertical",
                config: {
                  anchor: {
                    horizontal: "left",
                    vertical: "top",
                  },
                  gap: PHI_SPACE.base,
                  width: "100%",
                  maxWidth: "100%",
                  margin: 0,
                  padding: PHI_SPACE.base,
                  background: PHI_COLOR.bgLayout,
                  border: "none",
                  borderRadius: 0,
                },
              }
          : isRevisionsPage || isModulesPage
            ? {
                creationPreset: { layoutKind: "verticalflex", preset: "panel" },
                typeKey: "flex-vertical",
                id: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                siteId: page.siteId,
                parentLayoutNodeId: null,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: isModulesPage ? "dev modules content vertical" : "dev revisions content vertical",
                config: {
                  anchor: {
                    horizontal: "center",
                    vertical: "top",
                  },
                  gap: PHI_SPACE.base,
                  width: "100%",
                  maxWidth: "100%",
                  margin: 0,
                  padding: PHI_SPACE.base,
                  background: PHI_COLOR.bgLayout,
                  border: "none",
                  borderRadius: 0,
                },
              }
          : {
              typeKey: "content",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev content",
              config: {
                maxWidth: "100%",
                margin: 0,
                padding: 0,
                background: PHI_COLOR.bgLayout,
              },
            },
      ),
      ...((isStructurePage || isPagesPage)
        ? [
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 0,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: isStructurePage ? "dev shells workspace header" : "dev pages workspace header",
              config: {
                balancedSides: true,
                contentAlign: "center",
                gap: PHI_SPACE.base,
                padding: PHI_SPACE.xs,
                paddingLeft: 0,
                paddingRight: 0,
                border: "none",
                borderRadius: 0,
                height: "auto",
                minHeight: "auto",
              },
            }),
          ]
        : []),
      ...(isMediaPage
        ? [
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorHeader,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Asset inspector header",
              config: {
                anchor: { horizontal: "left", vertical: "middle" },
                gap: 0,
                padding: 0,
                paddingLeft: PHI_SPACE.lg,
                width: "100%",
                background: "transparent",
                border: "none",
              },
            }),
            buildPhiCmsLayoutNode({
              typeKey: "collapsible",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev media inspector body",
              config: {
                ghost: true,
                bordered: false,
                padding: PHI_SPACE.sm,
                innerPadding: PHI_SPACE.sm,
                slotTitles: [
                  mediaLabels?.inspector.previewTitle ?? "Preview",
                  mediaLabels?.inspector.metadataTitle ?? "Metadata",
                ],
                defaultOpenSlotKeys: ["slot_0", "slot_1"],
                background: "transparent",
              },
            }),
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorFooter,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev media inspector footer",
              config: {},
            }),
            buildPhiCmsLayoutNode({
              typeKey: "content",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectBody,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Asset focal rectangle body",
              config: {
                width: "100%",
                maxWidth: "100%",
                margin: 0,
                padding: 0,
                background: PHI_COLOR.bgLayout,
                border: "none",
                borderRadius: 0,
              },
            }),
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectFooter,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Asset focal rectangle footer",
              config: {},
            }),
            buildPhiCmsLayoutNode({
              typeKey: "content",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateBody,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Create asset folder body",
              config: {
                width: "100%",
                maxWidth: "100%",
                margin: 0,
                padding: PHI_SPACE.base,
                background: PHI_COLOR.bgLayout,
                border: "none",
                borderRadius: 0,
              },
            }),
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateFooter,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Create asset folder footer",
              config: {},
            }),
          ]
        : []),
      ...(isModulesPage ? [
        buildPhiCmsLayoutNode({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS.body,
          siteId: page.siteId,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: "Builder module detail body",
          config: {
            gap: PHI_SPACE.base,
            padding: PHI_SPACE.base,
            width: "100%",
            background: PHI_COLOR.bgLayout,
            border: "none",
          },
        }),
      ] : []),
      ...(isPagesPage ? [
        buildPhiCmsLayoutNode({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_PAGE_META_LAYOUT_IDS.body,
          siteId: page.siteId,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: "Builder page metadata body",
          config: {
            gap: PHI_SPACE.base,
            padding: PHI_SPACE.base,
            width: "100%",
            background: PHI_COLOR.bgLayout,
            border: "none",
          },
        }),
        buildPhiCmsLayoutNode({
          creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
          typeKey: "flex",
          id: PHI_BUILDER_PAGE_META_LAYOUT_IDS.footer,
          siteId: page.siteId,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: "Builder page metadata footer",
          config: {},
        }),
      ] : []),
      ...(isThemePage
        ? [
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandControlsHeader,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 0,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev brand controls header",
              config: {
                balancedSides: true,
                contentAlign: "center",
                gap: PHI_SPACE.base,
                padding: 0,
                paddingLeft: 0,
                paddingRight: 0,
              },
            }),
            buildPhiCmsLayoutNode({
              typeKey: "stack",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev brand stack",
              config: {
                defaultActiveSlotKey: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].key,
                key: PHI_BUILDER_THEME_STACK_SIGNAL_KEY,
                anchor: {
                  horizontal: "left",
                  vertical: "top",
                },
                padding: 0,
              },
            }),
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandCardsRow,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Color",
              config: {
                gap: PHI_SPACE.base,
                anchor: {
                  horizontal: "left",
                  vertical: "top",
                },
                wrap: true,
                padding: 0,
                paddingLeft: 0,
                paddingRight: 0,
                background: "transparent",
                border: "none",
                borderRadius: 0,
              },
            }),
            buildPhiCmsLayoutNode({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStylePanel,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Style",
              config: {
                gap: PHI_SPACE.base,
                anchor: {
                  horizontal: "left",
                  vertical: "top",
                },
                wrap: true,
                padding: 0,
                paddingLeft: 0,
                paddingRight: 0,
                background: "transparent",
                border: "none",
                borderRadius: 0,
              },
            }),
          ]
        : []),
    ],
    contentWidgets: [
      ...(isPagesPage ? [
        buildPhiCmsWidgetNode({
          typeKey: "form",
          id: PHI_BUILDER_PAGE_META_WIDGET_IDS.form,
          siteId: page.siteId,
          parentLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.body,
          slotIndex: 0,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: "Builder page metadata form",
          config: {
            formId: PHI_BUILDER_PAGE_META_FORM_ID,
            formConfig: {},
            execution: { mode: "signal" },
            source: null,
            signalRoutes: {
              emits: [{ routeKey: "builder-page-meta-values", capabilityId: "submitValues", scope: "area", channel: "pageMetaForm", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() }],
              listens: [{ routeKey: "builder-page-meta-submit-form", capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PAGE_META_WIDGET_IDS.form) }],
            },
          },
          contentId: null,
        }),
        buildPhiCmsWidgetNode({
          typeKey: "command-toolbar",
          id: PHI_BUILDER_PAGE_META_WIDGET_IDS.commands,
          siteId: page.siteId,
          parentLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.footer,
          slotIndex: 0,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: "Page metadata commands",
          config: {
            key: "page-meta-commands",
            compact: false,
            wrap: true,
            showLabels: true,
            controlSize: "medium",
            buttons: [
              { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel" },
              { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", buttonType: "primary" },
            ],
            signalRoutes: {
              emits: [{
                routeKey: "builder-page-meta-command",
                capabilityId: "command",
                scope: "area",
                channel: "pageMeta",
                action: "activate",
                valueType: "string",
                receiver: createPhiBuilderControllerAddress(),
              }],
              listens: [{
                routeKey: "builder-page-meta-save-label",
                capabilityId: "label",
                scope: "page",
                channel: "label",
                action: "change",
                valueType: "string",
                receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_PAGE_META_WIDGET_IDS.commands, "save"),
              }, {
                routeKey: "builder-page-meta-save-loading",
                capabilityId: "loading",
                scope: "page",
                channel: "pageMetaSubmitting",
                action: "change",
                valueType: "boolean",
                receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_PAGE_META_WIDGET_IDS.commands, "save"),
              }],
            },
          },
          contentId: null,
        }),
      ] : []),
      ...(isMediaPage
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "collection-view",
              id: PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaPreview,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 0,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev media preview",
              config: {
                presentation: {
                  mode: "grid",
                  minColumnWidth: 102,
                  gap: PHI_SPACE.sm,
                  emptyDescription: mediaLabels?.grid.emptyDescription ?? "No assets found.",
                  controlSize: "small",
                  labels: mediaLabels ?? undefined,
                },
                features: {
                  tools: { mode: "self-contained", reload: true, reset: true },
                  filters: [
                    { key: "kind", control: "multi-select", placeholder: mediaLabels?.tool.kindLabel ?? "Kind", width: 124 },
                    { key: "presentationFlags", control: "multi-select", placeholder: mediaLabels?.tool.flagsLabel ?? "Flags", width: 144 },
                    {
                      key: "folderId",
                      control: "cascader",
                      placeholder: mediaLabels?.tool.folderLabel ?? "Folder",
                      width: 168,
                      actions: [{
                        key: "createFolder",
                        label: mediaLabels?.tool.createFolderLabel ?? "Create folder",
                        description: mediaLabels?.tool.createFolderLabel ?? "Create folder",
                        icon: "add",
                        display: "icon",
                        mode: "primary",
                      }],
                    },
                  ],
                  search: { enabled: true, placeholder: mediaLabels?.tool.searchPlaceholder ?? "Search assets", minWidth: 180 },
                  actions: {
                    toolbar: [
                      {
                        key: "upload",
                        label: mediaLabels?.tool.uploadToggleLabel ?? "Upload",
                        description: mediaLabels?.tool.uploadToggleLabel ?? "Upload",
                        icon: "upload",
                        display: "icon",
                        mode: "primary",
                      },
                    ],
                  },
                  pagination: {
                    enabled: true,
                    pageSize: 20,
                    simple: true,
                    showSizeChanger: false,
                  },
                },
                initialQuery: {
                  page: 1,
                  pageSize: 20,
                  sortKey: "created_at",
                  sortOrder: "descend",
                  filters: { kind: [PhiMediaKind.Image] },
                },
                source: {
                  providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
                  resourceKey: "assets",
                },
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-media-selection-open",
                      capabilityId: "selection",
                      scope: "page",
                      channel: "selection",
                      action: "change",
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection,
                      receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaInspector),
                    },
                    {
                      routeKey: "builder-media-selection-controller",
                      capabilityId: "selection",
                      scope: "area",
                      channel: "assetSelection",
                      action: "change",
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection,
                      receiver: createPhiAssetControllerAddress(),
                    },
                    {
                      routeKey: "builder-media-collection-action-controller",
                      capabilityId: "actionActivate",
                      scope: "area",
                      channel: "assetCollectionAction",
                      action: "activate",
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
                      receiver: createPhiAssetControllerAddress(),
                    },
                  ],
                  listens: [{
                    routeKey: "builder-media-collection-reload",
                    capabilityId: "reload",
                    scope: "page",
                    channel: "reload",
                    action: "activate",
                    valueType: "none",
                    receiver: createPhiSignalAddress("cms", PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaPreview),
                  }],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "image-inspector",
              id: PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaInspector,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev media inspector",
              config: {
                section: "preview",
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-media-focal-rect-open-request",
                    capabilityId: "focalRectOpen",
                    scope: "page",
                    channel: "focalRectDialog",
                    action: "open",
                    valueType: "none",
                    receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFocalRect),
                  }],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "form",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev media metadata form",
              config: {
                formId: PHI_ASSET_METADATA_FORM_ID,
                formConfig: {},
                execution: { mode: "handler" },
                source: null,
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-media-metadata-submit-success",
                      capabilityId: "submitSuccess",
                      scope: "area",
                      channel: "assetInspectorSubmit",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiAssetControllerAddress(),
                    },
                    {
                      routeKey: "builder-media-metadata-submitting",
                      capabilityId: "submitting",
                      scope: "area",
                      channel: "assetInspectorSubmitting",
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiAssetControllerAddress(),
                    },
                  ],
                  listens: [
                    {
                      routeKey: "builder-media-metadata-submit",
                      capabilityId: "submit",
                      scope: "page",
                      channel: "submit",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm),
                    },
                    {
                      routeKey: "builder-media-metadata-reset",
                      capabilityId: "reset",
                      scope: "page",
                      channel: "reset",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm),
                    },
                  ],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "command-toolbar",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaInspectorCommands,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev media inspector commands",
              config: {
                key: "media-inspector-commands",
                compact: false,
                wrap: true,
                showLabels: true,
                controlSize: "medium",
                buttons: [
                  { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", buttonType: "primary" },
                ],
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-media-inspector-command",
                    capabilityId: "command",
                    scope: "area",
                    channel: "assetInspectorCommand",
                    action: "activate",
                    valueType: "string",
                    receiver: createPhiAssetControllerAddress(),
                  }],
                  listens: [{
                    routeKey: "builder-media-inspector-save-loading",
                    capabilityId: "loading",
                    scope: "page",
                    channel: "submitting",
                    action: "change",
                    valueType: "boolean",
                    receiver: createPhiSignalSubcontrolAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaInspectorCommands, "save"),
                  }],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "asset-focal-rect",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFocalRect,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectBody,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Asset focal rectangle editor",
              config: {
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-media-focal-rect-field-change",
                      capabilityId: "focalRectChange",
                      scope: "page",
                      channel: "field",
                      action: "change",
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField,
                      receiver: createPhiRuntimeFormControllerAddress(
                        `widget-${PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm}`,
                      ),
                    },
                    {
                      routeKey: "builder-media-focal-rect-close-request",
                      capabilityId: "close",
                      scope: "page",
                      channel: "focalRectDialog",
                      action: "close",
                      valueType: "none",
                      receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFocalRect),
                    },
                  ],
                  listens: [{
                    routeKey: "builder-media-focal-rect-command-receive",
                    capabilityId: "command",
                    scope: "page",
                    channel: "focalRectCommand",
                    action: "activate",
                    valueType: "string",
                    receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFocalRect),
                  }],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "form",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateForm,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateBody,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Create asset folder form",
              config: {
                formId: PHI_ASSET_FOLDER_FORM_ID,
                formConfig: {},
                execution: { mode: "handler" },
                source: null,
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-media-folder-submit-success",
                      capabilityId: "submitSuccess",
                      scope: "area",
                      channel: "assetFolderSubmit",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiAssetControllerAddress(),
                    },
                    {
                      routeKey: "builder-media-folder-submitting",
                      capabilityId: "submitting",
                      scope: "area",
                      channel: "assetFolderSubmitting",
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiAssetControllerAddress(),
                    },
                  ],
                  listens: [
                    {
                      routeKey: "builder-media-folder-submit",
                      capabilityId: "submit",
                      scope: "page",
                      channel: "submit",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateForm),
                    },
                    {
                      routeKey: "builder-media-folder-reset",
                      capabilityId: "reset",
                      scope: "page",
                      channel: "reset",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateForm),
                    },
                  ],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "command-toolbar",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateCommands,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Create asset folder commands",
              config: {
                key: "media-folder-create-commands",
                compact: false,
                wrap: true,
                showLabels: true,
                controlSize: "medium",
                buttons: [
                  { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel" },
                  { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", buttonType: "primary" },
                ],
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-media-folder-command",
                    capabilityId: "command",
                    scope: "area",
                    channel: "assetFolderCommand",
                    action: "activate",
                    valueType: "string",
                    receiver: createPhiAssetControllerAddress(),
                  }],
                  listens: [{
                    routeKey: "builder-media-folder-save-loading",
                    capabilityId: "loading",
                    scope: "page",
                    channel: "submitting",
                    action: "change",
                    valueType: "boolean",
                    receiver: createPhiSignalSubcontrolAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateCommands, "save"),
                  }],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "command-toolbar",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFocalRectCommands,
              siteId: page.siteId,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Asset focal rectangle commands",
              config: {
                key: "media-focal-rect-commands",
                compact: false,
                wrap: true,
                showLabels: true,
                controlSize: "medium",
                buttons: [
                  { key: "reset", emits: [{ capabilityId: "command", value: "reset" }], actionKey: "reset" },
                  { key: "clear", emits: [{ capabilityId: "command", value: "clear" }], actionKey: "clear" },
                  { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel" },
                  { key: "apply", emits: [{ capabilityId: "command", value: "apply" }], actionKey: "apply", buttonType: "primary" },
                ],
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-media-focal-rect-command",
                    capabilityId: "command",
                    scope: "page",
                    channel: "focalRectCommand",
                    action: "activate",
                    valueType: "string",
                    receiver: createPhiSignalAddress("cms", PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFocalRect),
                  }],
                },
              },
              contentId: null,
            }),
          ]
        : []),
      ...(isStructurePage
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "switch",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetStructureSiderFullHeightSwitch,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Sider full height switch",
              config: {
                label: "Sider full height",
                defaultChecked: true,
                key: "dev-structure-sider-full-height-switch",
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "shell-sider-layout-change",
                      capabilityId: "change",
                      scope: "area",
                      channel: "layout",
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiBuilderControllerAddress(),
                    },
                  ],
                  listens: [
                    {
                      routeKey: "shell-sider-layout-feedback",
                      capabilityId: "change",
                      scope: "area",
                      channel: "layout",
                      action: "change",
                      valueType: "boolean",
                      receiver: "broadcast",
                    },
                  ],
                },
              },
              contentId: null,
            }),
            /*
             * Where the Area's `/` goes.
             *
             * A plain Select, next to the Sider switch it shares the header with, because it is the
             * same kind of statement: about the Area being edited rather than about anything on the
             * canvas. The choices are the Area's own registered Pages plus the two answers that are
             * not a Page, and what a choice stores is a Page reference rather than a path.
             */
            buildPhiCmsWidgetNode({
              typeKey: "select-box",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetAreaRootRoute,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "Area root route select",
              config: {
                key: "areaRootRoute",
                label: labels.rootRoute.title,
                placeholder: labels.rootRoute.title,
                options: [],
                optionsProvider: {
                  providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.areaRootRoute,
                  params: {
                    automaticLabel: labels.rootRoute.automatic,
                    landingLabel: labels.rootRoute.landing,
                  },
                },
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-area-root-route-change",
                      capabilityId: "change",
                      scope: "area",
                      channel: "rootRoute",
                      action: "change",
                      valueType: "string",
                      receiver: createPhiBuilderControllerAddress(),
                    },
                  ],
                },
              },
              contentId: null,
            }),
            buildPhiCmsWidgetNode({
              typeKey: "command-toolbar",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev structure toolbar",
              config: builderCommandToolbarConfig,
              contentId: null,
            }),
          ]
        : isPagesPage
          ? [
              buildPhiCmsWidgetNode({
                typeKey: "cascader",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesHeaderSelector,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev pages select",
                config: {
                  key: "pageSelect",
                  signalRoutes: {
                    emits: [
                      {
                    routeKey: "builder-page-path-change",
                    capabilityId: "change",
                        scope: "page",
                        channel: "path",
                        action: "change",
                        valueType: "path",
                        receiver: "broadcast",
                      },
                    ],
                  },
                  placeholder: labels.pages.selectPage,
                  optionsProvider: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderPages,
                  },
                  options: [],
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "input",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesHeaderTitle,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "Page title input",
                config: {
                  text: "",
                  placeholder: labels.pages.form.title,
                  key: "pageTitle",
                  signalRoutes: {
                    listens: [
                      {
                        routeKey: "builder-current-page-title",
                        capabilityId: "change",
                        scope: "page",
                        channel: "pageTitle",
                        action: "change",
                        valueType: "string",
                        receiver: "broadcast",
                      },
                    ],
                  },
                  inputType: "text",
                  allowClear: false,
                  disabled: true,
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesMetaToolbar,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev pages meta toolbar",
                config: {
                  key: "pageMetaToolbar",
                  signalRoutes: {
                    emits: [
                      {
                    routeKey: "builder-pages-command",
                    capabilityId: "command",
                        scope: "area",
                        channel: "command",
                        action: "activate",
                        valueType: "string",
                        receiver: createPhiBuilderControllerAddress(),
                      },
                    ],
                  },
                  compact: true,
                  wrap: false,
                  showLabels: true,
                  buttons: [
                    {
                      key: "createPage",
                      emits: [{ capabilityId: "command", value: "createPage" }],
                      label: labels.pages.newPage,
                      icon: "plus",
                    },
                    {
                      key: "editPageMeta",
                      emits: [{ capabilityId: "command", value: "editPageMeta" }],
                      label: labels.pages.pageMeta,
                      icon: "edit",
                    },
                    {
                      key: "deletePage",
                      emits: [{ capabilityId: "command", value: "deletePage" }],
                      label: labels.pages.deletePage,
                      tooltip: labels.pages.deletePage,
                      icon: "delete",
                      display: "icon",
                      danger: true,
                    },
                  ],
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev pages toolbar",
                config: builderCommandToolbarConfig,
                contentId: null,
              }),
            ]
        : isThemePage
          ? [
              buildPhiCmsWidgetNode({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev brand toolbar",
                config: builderCommandToolbarConfig,
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "select-box",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandContextSelect,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "Brand preset select",
                config: {
                  value: resolvePhiThemeSelectionValue(
                    runtime.site.key,
                    runtime.site.themeRevision?.publishedRevisionId != null ||
                      runtime.site.themeRevision?.workingDraftRevisionId != null,
                  ),
                  key: "brand-theme-preset",
                  signalRoutes: {
                    emits: [
                      {
                        routeKey: "brand-theme-select-change",
                        capabilityId: "change",
                        scope: "area",
                        channel: PHI_THEME_SIGNAL_CHANNELS.presetSelect,
                        action: "change",
                        valueType: "string",
                        receiver: createPhiThemeControllerAddress(),
                      },
                    ],
                    listens: [
                      {
                        routeKey: "brand-theme-select-feedback",
                        capabilityId: "selection",
                        scope: "area",
                        channel: PHI_THEME_SIGNAL_CHANNELS.presetSelect,
                        action: "change",
                        valueType: "string",
                        receiver: "broadcast",
                      },
                    ],
                  },
                  options: [
                    {
                      value: createPhiSiteThemeSelectionValue(runtime.site.key),
                      label: runtime.site.name?.trim() || runtime.site.key,
                      description: "Site theme",
                    },
                    ...[...registry.themeByKey.values()]
                      .filter(({ descriptor }) => activeModuleKeys.has(descriptor.ownerModuleId))
                      .map(({ descriptor }) => ({
                        value: descriptor.themeKey,
                        label: descriptor.title,
                        description: descriptor.description,
                      })),
                  ],
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "switch",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandPreviewModeSwitch,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandControlsHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "Brand preview mode switch",
                config: {
                  defaultChecked: runtime.site.theme?.mode === "dark",
                  checkedChildren: labels.themeSwitch.dark,
                  unCheckedChildren: labels.themeSwitch.light,
                  key: "brandPreviewThemeMode",
                  signalRoutes: {
                    emits: [
                      {
                    routeKey: "brand-preview-mode-change",
                    capabilityId: "change",
                        scope: "page",
                        channel: PHI_THEME_SIGNAL_CHANNELS.previewThemeMode,
                        action: "change",
                        valueType: "boolean",
                        receiver: "broadcast",
                      },
                    ],
                  },
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "segmented",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetThemeStackSegmented,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandControlsHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "Theme stack segmented",
                config: {
                  value: "0",
                  valueMode: "stack-slot-index",
                  key: PHI_BUILDER_THEME_STACK_SIGNAL_KEY,
                  signalRoutes: {
                    emits: [
                      {
                        routeKey: "brand-stack-meta-request",
                        capabilityId: "stackMeta",
                        scope: "page",
                        channel: "stackMeta",
                        action: "activate",
                        valueType: "none",
                        receiver: createPhiSignalAddress("cms", SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack),
                      },
                      {
                        routeKey: "brand-stack-slot-change",
                        capabilityId: "activeSlotIndex",
                        scope: "page",
                        channel: "activeSlotIndex",
                        action: "change",
                        valueType: "number",
                        receiver: createPhiSignalAddress("cms", SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack),
                      },
                    ],
                    listens: [
                      {
                        routeKey: "brand-stack-meta-response",
                        capabilityId: "stackMeta",
                        scope: "page",
                        channel: "stackMeta",
                        action: "change",
                        valueType: "json",
                        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
                        receiver: "broadcast",
                      },
                    ],
                  },
                  options: [
                    { value: "0",
 label: "Color" },
                    { value: "1",
 label: "Style" },
                  ],
                },
                contentId: null,
              }),
            ]
        : isModulesPage
          ? [
              /*
               * The Module selection is Area-wide, so the page choice here steers nothing but Preview:
               * it names the page the Preview button opens once the selection is saved.
               */
              buildPhiCmsWidgetNode({
                typeKey: "cascader",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesHeaderSelector,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev modules preview page select",
                config: {
                  key: "pageSelect",
                  signalRoutes: {
                    emits: [
                      {
                        routeKey: "builder-page-path-change",
                        capabilityId: "change",
                        scope: "page",
                        channel: "path",
                        action: "change",
                        valueType: "path",
                        receiver: "broadcast",
                      },
                    ],
                  },
                  placeholder: labels.pages.selectPage,
                  optionsProvider: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderPages,
                  },
                  options: [],
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev modules toolbar",
                config: builderCommandToolbarConfig,
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "table",
                id: PHI_BUILDER_MODULES_TABLE_WIDGET_ID,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 0,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev modules table",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
                    resourceKey: "modules",
                    params: {
                      categoryLabels: modulesLabels?.categories ?? null,
                    },
                  },
                  presentation: {
                    bordered: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      {
                        key: "active",
                        fieldKey: "active",
                        title: modulesLabels?.columns.active ?? "Active",
                        renderer: "switch",
                        align: "center",
                        sticky: "left",
                        editor: {
                          control: "switch",
                          disabledWhen: { source: "row", valuePath: "locked", operator: "truthy" },
                        },
                      },
                      { key: "title", fieldKey: "title", iconFieldKey: "icon", title: modulesLabels?.columns.title ?? "Module", sortable: true },
                      { key: "category", fieldKey: "category", title: modulesLabels?.columns.category ?? "Category", sortable: true },
                      { key: "description", fieldKey: "description", title: modulesLabels?.columns.description ?? "Description", sizing: { mode: "fill" } },
                    ],
                    controlSize: "small",
                    footer: {
                      template: `%1 ${modulesLabels?.footer.modules ?? "modules"}`,
                      values: [{ key: "modules", value: { source: "core", fieldKey: "totalRows" } }],
                      align: "start",
                    },
                  },
                  features: {
                    search: { enabled: true },
                    pagination: { enabled: false, pageSize: 200, showSizeChanger: false },
                    sorting: { mode: "single" },
                    editing: { mode: "cell" },
                    tools: { mode: "self-contained", reset: false, reload: false },
                    actions: { row: [{
                      key: "details",
                      label: modulesLabels?.actions.details ?? "Details",
                      icon: "antd:info-circle",
                      display: "icon",
                      execution: "signal",
                    }] },
                  },
                  signalRoutes: {
                    emits: [
                      { routeKey: "builder-modules-table-action", capabilityId: "actionActivate", scope: "area", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction, receiver: createPhiBuilderControllerAddress() },
                    ],
                  },
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "table",
                id: PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS.fields,
                siteId: page.siteId,
                parentLayoutNodeId: PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS.body,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev module detail fields",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
                    resourceKey: "moduleDetail",
                    params: {
                      moduleId: "",
                      areaLabels: modulesLabels?.areas ?? null,
                      categoryLabels: modulesLabels?.categories ?? null,
                      detailLabels: modulesDetailLabels,
                    },
                  },
                  presentation: {
                    bordered: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      { key: "label", fieldKey: "label", title: modulesLabels?.detail.field ?? "Field" },
                      { key: "value", fieldKey: "value", title: modulesLabels?.detail.value ?? "Value", sizing: { mode: "fill" } },
                    ],
                    controlSize: "small",
                  },
                  features: {
                    pagination: { enabled: false, pageSize: 50, showSizeChanger: false },
                    sorting: { mode: "none" },
                    tools: { mode: "self-contained", reset: false, reload: false },
                  },
                  signalRoutes: {
                    listens: [
                      { routeKey: "builder-module-detail-binding", capabilityId: "bindingParamsChange", scope: "page", channel: "bindingParams", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams, receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS.fields) },
                    ],
                  },
                },
                contentId: null,
              }),
            ]
        : isNavigationPage
          ? [
              buildPhiCmsWidgetNode({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev navigation toolbar",
                config: builderCommandToolbarConfig,
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "tree",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetNavigationSource,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 0,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev navigation source",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.pageSourceTree,
                    resourceKey: "pages",
                  },
                  presentation: {
                    width: "20rem",
                    minWidth: "16.25rem",
                    maxWidth: "100%",
                    controlSize: "small",
                    bordered: true,
                    blockNode: true,
                    showIcon: false,
                    virtual: false,
                    node: {
                      titleFieldKey: "title",
                      descriptionFieldKey: "path",
                    },
                  },
                  features: {
                    search: { enabled: true, placeholder: navigationLabels!.sourceSearchPlaceholder },
                    selection: { mode: "single" },
                    checking: { enabled: false },
                    expansion: { defaultExpandAll: false },
                    editing: { enabled: false },
                    tools: {
                      mode: "self-contained",
                      bindingFields: [{ key: "area", control: "select", width: "7.5rem" }],
                      reset: false,
                      reload: false,
                    },
                    dnd: { mode: "source", payloadType: PHI_BUILDER_NAVIGATION_DND_TYPE_PAGE },
                  },
                },
                contentId: null,
              }),
              buildPhiCmsWidgetNode({
                typeKey: "table",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetNavigationItems,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 1,
                sortOrder: 1,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev navigation items",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.navigationTable,
                    resourceKey: "navigationItems",
                  },
                  signalRoutes: {
                    emits: [{
                      routeKey: "builder-navigation-binding-params",
                      capabilityId: "bindingParamsChange",
                      scope: "area",
                      channel: "bindingParams",
                      action: "change",
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
                      receiver: createPhiBuilderControllerAddress(),
                    }],
                  },
                  presentation: {
                    bordered: true,
                    layout: { mode: "fixed", overflowX: "auto" },
                    footer: {
                      template: navigationLabels!.footerTemplate,
                      values: [
                        { key: "entries", value: { source: "provider", fieldKey: "entries" } },
                        { key: "hidden", value: { source: "provider", fieldKey: "hidden" } },
                      ],
                    },
                    row: {
                      mutedWhen: { match: "any", conditions: [
                        { source: "row", valuePath: "hidden", operator: "truthy" },
                        { source: "row", valuePath: "hiddenByAncestor", operator: "truthy" },
                      ] },
                    },
                    columns: [
                      { key: "icon", fieldKey: "icon", title: navigationLabels!.columns.icon, renderer: "icon", editor: { control: "icon-picker" }, sizing: { mode: "fixed", width: 88 } },
                      { key: "label", fieldKey: "label", title: navigationLabels!.columns.label, editor: {}, sizing: { mode: "fixed", width: 180 }, ellipsis: true },
                      {
                        key: "navigationType",
                        fieldKey: "navigationType",
                        title: navigationLabels!.columns.type,
                        renderer: "badge",
                        sizing: { mode: "fixed", width: 112 },
                        valueMap: navigationLabels!.types,
                        tagColorMap: { link: "success", external: "warning", container: "processing", separator: "default" },
                      },
                      { key: "origin", fieldKey: "origin", title: navigationLabels!.columns.origin, sizing: { mode: "fixed", width: 140 }, ellipsis: true },
                      {
                        key: "href",
                        fieldKey: "href",
                        title: navigationLabels!.columns.path,
                        editor: {},
                        sizing: { mode: "fill", minWidth: 220 },
                        ellipsis: true,
                        valueMap: { "@phi/deleted-page-target": navigationLabels!.deletedTarget },
                      },
                      {
                        key: "newTab",
                        fieldKey: "newTab",
                        title: navigationLabels!.columns.newTab,
                        renderer: "checkbox",
                        editor: {
                          control: "checkbox",
                          disabledWhen: { source: "row", valuePath: "newTabEditable", operator: "falsy" },
                        },
                        sizing: { mode: "fixed", width: 88 },
                      },
                    ],
                    controlSize: "small",
                    emptyState: { title: navigationLabels!.emptyTitle },
                  },
                  features: {
                    pagination: { enabled: false },
                    sorting: { mode: "none" },
                    rowReordering: { enabled: true },
                    editing: { mode: "cell" },
                    tools: {
                      mode: "self-contained",
                      bindingFields: [{
                        key: "navKey",
                        placeholder: navigationLabels!.navigation.placeholder,
                        control: "select",
                        create: {
                          label: navigationLabels!.navigation.create,
                          description: navigationLabels!.navigation.create,
                          icon: "antd:plus",
                          display: "icon",
                          placeholder: navigationLabels!.navigation.keyPlaceholder,
                          submitLabel: navigationLabels!.navigation.createSubmit,
                        },
                      }],
                      reset: false,
                      reload: true,
                    },
                    structure: { mode: "tree", parentRowIdentityPath: "parentId", expandColumnKey: "icon", expandRowByClick: true },
                    actions: {
                      toolbar: [
                        { key: "add-link", label: navigationLabels!.actions.addLink, icon: "antd:plus", display: "icon", execution: "provider" },
                        { key: "add-container", label: navigationLabels!.actions.addContainer, icon: "antd:folder-add", display: "icon", execution: "provider" },
                        { key: "add-separator", label: navigationLabels!.actions.addSeparator, icon: "antd:minus", display: "icon", execution: "provider" },
                      ],
                      row: [
                        { key: "hide", label: navigationLabels!.actions.hide, icon: "antd:eye", display: "icon", execution: "provider" },
                        { key: "show", label: navigationLabels!.actions.show, icon: "antd:eye-invisible", display: "icon", execution: "provider" },
                        {
                          key: "delete",
                          label: navigationLabels!.actions.delete,
                          icon: "antd:delete",
                          display: "icon",
                          mode: "danger",
                          execution: "provider",
                          confirm: {
                            title: navigationLabels!.actions.deleteConfirm,
                            okText: navigationLabels!.actions.delete,
                            cancelText: navigationLabels!.actions.cancel,
                          },
                        },
                      ],
                    },
                  },
                },
                contentId: null,
              }),
            ]
        : isRevisionsPage
          ? [
              buildPhiCmsWidgetNode({
                typeKey: "table",
                id: PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 0,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev revisions table",
                config: {
                  source: {
                    providerKey: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
                    resourceKey: "history",
                    params: { labels: revisionsLabels },
                  },
                  presentation: {
                    bordered: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      { key: "revisionTags", fieldKey: "revisionTags", title: revisionsLabels?.columns.revision ?? "Revision", renderer: "tags", sticky: "left" },
                      { key: "createdAt", fieldKey: "createdAt", title: revisionsLabels?.columns.created ?? "Created", renderer: "datetime" },
                      { key: "createdByDisplay", fieldKey: "createdByDisplay", title: revisionsLabels?.columns.by ?? "By" },
                      { key: "formattedMessage", fieldKey: "formattedMessage", title: revisionsLabels?.columns.message ?? "Message", sizing: { mode: "fill" } },
                    ],
                    controlSize: "small",
                    footer: {
                      template: `%1 ${revisionsLabels?.revisionsLabel ?? "revisions"}`,
                      values: [{ key: "revisions", value: { source: "core", fieldKey: "totalRows" } }],
                      align: "start",
                    },
                  },
                  features: {
                    rowSelection: { mode: "multiple", preserveSelectedRowIdentities: false, disabledWhen: { source: "row", valuePath: "deleteDisabled", operator: "truthy" } },
                    pagination: { enabled: false, pageSize: 100, showSizeChanger: false },
                    sorting: { mode: "none" },
                    tools: {
                      mode: "self-contained",
                      bindingFields: [
                        {
                          key: "kind",
                          label: revisionsLabels?.kindLabel ?? "Type",
                          control: "select",
                          optionLabels: [
                            { value: "area", label: revisionsLabels?.kindOptions.area ?? "Area" },
                            { value: "page", label: revisionsLabels?.kindOptions.page ?? "Page" },
                            { value: "navigation", label: revisionsLabels?.kindOptions.navigation ?? "Navigation" },
                            { value: "theme", label: revisionsLabels?.kindOptions.theme ?? "Theme" },
                          ],
                        },
                        {
                          key: "scopeKey",
                          label: revisionsLabels?.scopeLabel ?? "Scope",
                          control: "cascader",
                          disabledWhen: { fieldKey: "kind", equals: "area" },
                          cascader: {
                            allowRoot: false,
                            separator: "/",
                            rootValue: "/",
                            normalize: "raw",
                          },
                        },
                      ],
                      reset: false,
                      reload: true,
                    },
                    actions: { row: [
                      { key: "review", label: revisionsLabels?.actions.review ?? "Review", icon: "eye", display: "icon", execution: "link", hrefPath: "reviewHref", newTab: true },
                      {
                        key: "restore",
                        label: revisionsLabels?.actions.restore ?? "Restore",
                        icon: "antd:reload",
                        display: "icon",
                        execution: "provider",
                        confirm: {
                          title: revisionsLabels?.confirm.restoreTitle ?? "Restore revision?",
                          description: revisionsLabels?.confirm.restoreDescription,
                          okText: revisionsLabels?.actions.restore ?? "Restore",
                        },
                      },
                      {
                        key: "delete",
                        label: revisionsLabels?.actions.delete ?? "Delete",
                        icon: "antd:delete",
                        display: "icon",
                        mode: "danger",
                        execution: "provider",
                        confirm: {
                          title: revisionsLabels?.confirm.deleteTitle ?? "Delete revision?",
                          description: revisionsLabels?.confirm.deleteDescription,
                          okText: revisionsLabels?.actions.delete ?? "Delete",
                        },
                      },
                    ], bulk: [
                      {
                        key: "deleteSelected",
                        label: revisionsLabels?.actions.deleteSelected ?? "Delete selected",
                        icon: "antd:delete",
                        display: "icon-label",
                        mode: "danger",
                        execution: "provider",
                        confirm: {
                          title: revisionsLabels?.confirm.deleteSelectedTitle ?? "Delete selected revisions?",
                          description: revisionsLabels?.confirm.deleteSelectedDescription,
                          okText: revisionsLabels?.actions.deleteSelected ?? "Delete selected",
                        },
                      },
                    ] },
                  },
                  signalRoutes: {
                    emits: [
                      { routeKey: "builder-revisions-table-binding", capabilityId: "bindingParamsChange", scope: "area", channel: "bindingParams", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams, receiver: createPhiRevisionsControllerAddress() },
                      { routeKey: "builder-revisions-table-mutation", capabilityId: "mutationChange", scope: "area", channel: "mutation", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableMutation, receiver: createPhiRevisionsControllerAddress() },
                    ],
                    listens: [
                      { routeKey: "builder-revisions-table-binding-input", capabilityId: "bindingParamsChange", scope: "area", channel: "bindingParams", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams, receiver: createPhiSignalAddress("cms", PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID) },
                    ],
                  },
                },
                contentId: null,
              }),
            ]
        : []),
      ...((isStructurePage || isPagesPage)
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "builder-mode-switch",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderModeSwitch,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev builder mode switch",
              config: {},
              contentId: null,
            }),
          ]
        : []),
      ...((isStructurePage || isPagesPage || isNavigationPage || isThemePage || isModulesPage)
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "builder-draft-status",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetDraftStatus,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: isThemePage ? "builder brand draft status" : "builder draft status",
              config: {},
              contentId: null,
            }),
          ]
        : []),
      ...(isStructurePage
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "builder-shells-workspace",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetCanvas,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 1,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "dev shells workspace",
              config: {},
              contentId: null,
            }),
          ]
        : isPagesPage
          ? [
              buildPhiCmsWidgetNode({
                typeKey: "builder-pages-workspace",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetCanvas,
                siteId: page.siteId,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 1,
                sortOrder: 0,
                status: PhiCmsStatus.Published,
                flags: 0,
                visibilityMask: page.visibilityMask,
                label: "dev pages workspace",
                config: {},
                contentId: null,
              }),
            ]
        : isMediaPage
          ? []
          : isThemePage
            ? [
                buildPhiCmsWidgetNode({
                  typeKey: "builder-brand-theme-controls",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandThemeControls,
                  siteId: page.siteId,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandCardsRow,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
                  sortOrder: 0,
                  status: PhiCmsStatus.Published,
                  flags: 0,
                  visibilityMask: page.visibilityMask,
                  label: "dev brand theme controls",
                  config: {
                    themeKey: "default",
                    minSize: { width: 300 },
                    maxSize: { width: 400 },
                  },
                  contentId: null,
                }),
                buildPhiCmsWidgetNode({
                  typeKey: "builder-brand-theme-preview",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandThemePreview,
                  siteId: page.siteId,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandCardsRow,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                  sortOrder: 1,
                  status: PhiCmsStatus.Published,
                  flags: 0,
                  visibilityMask: page.visibilityMask,
                  label: "dev brand theme preview",
                  config: {
                    themeKey: "default",
                    minSize: { width: 360 },
                  },
                  contentId: null,
                }),
                buildPhiCmsWidgetNode({
                  typeKey: "builder-brand-style-controls",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandStyleControls,
                  siteId: page.siteId,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStylePanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
                  sortOrder: 0,
                  status: PhiCmsStatus.Published,
                  flags: 0,
                  visibilityMask: page.visibilityMask,
                  label: "dev brand style controls",
                  config: {
                    themeKey: "default",
                    minSize: { width: 300 },
                    maxSize: { width: 400 },
                  },
                  contentId: null,
                }),
                buildPhiCmsWidgetNode({
                  typeKey: "builder-brand-theme-preview",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandStylePreview,
                  siteId: page.siteId,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStylePanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                  sortOrder: 1,
                  status: PhiCmsStatus.Published,
                  flags: 0,
                  visibilityMask: page.visibilityMask,
                  label: "dev brand style preview",
                  config: {
                    themeKey: "default",
                    minSize: { width: 360 },
                  },
                  contentId: null,
                }),
              ]
          : []),
    ],
  };
}

export async function buildPhiDefaultBuilderPagePresetTree({
  page,
  runtime,
  registry,
  activeModuleKeys,
  ownerModuleId,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  registry: PhiCmsCompiledDescriptorCatalog;
  activeModuleKeys: ReadonlySet<string>;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
}) {
  return remapBuilderPresetTreeInstanceIds(
    await buildPhiDefaultBuilderPagePresetTemplateTree({
      page,
      runtime,
      registry,
      activeModuleKeys,
    }),
    ownerModuleId,
    presetKey,
  );
}
