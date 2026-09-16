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
import { PHI_CMS_AREA_KEYS } from "../../../constants/cms-areas";
import { PhiMediaKind } from "../../../constants/media";
import { buildPhiCmsLayoutNode } from "../../../helpers/cms-node-factories";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { PHI_AREA_META_PUBLIC_DEFAULTS } from "../../../helpers/cms-area-config";
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
  buildPhiSiteThemeSelectOption,
  resolvePhiThemeSelectionValue,
} from "../../../theme/phi-theme-selection";
import { buildPhiThemeSetSelectOptions } from "../../../plugins/runtime-modules/theme/set-options";
import { createPhiBuilderControllerAddress } from "../../../plugins/runtime-modules/builder/controller/address";
import {
  isPhiAreaScopedBuilderPage,
  isPhiDebugScaffoldBuilderPage,
  readPhiDeveloperBuilderWorkspaceKey,
} from "../../../plugins/runtime-modules/builder/route-scope";
import { createPhiThemeControllerAddress } from "../../../plugins/runtime-modules/theme/controller/address";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCoreRuntimeControllerAddress } from "../../runtime/core-runtime-controller-address";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/asset/ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/builder/ids";
import {
  PHI_BUILDER_MODULES_TABLE_ALL_AREAS_VALUE,
  PHI_BUILDER_MODULES_TABLE_FILTER_KEYS,
} from "../../../plugins/runtime-modules/builder/data-providers";
import { PHI_BUILDER_NAVIGATION_DND_TYPE_PAGE } from "../../../constants/builder-navigation-dnd";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";
import { getPhiBuilderChromeWidgetLabels } from "../../widgets/label-sets/builder-chrome";
import { PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS } from "../../widgets/label-types/builder-chrome";
import type { PhiBuilderChromeWidgetLabels } from "../../widgets/label-types/builder-chrome";
import { getPhiBuilderRevisionsWidgetLabels } from "../../widgets/label-sets/revisions";
import { getPhiBuilderModulesPageLabels } from "../../widgets/label-sets/builder-modules";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/revisions/ids";
import { createPhiRevisionsControllerAddress } from "../../../plugins/runtime-modules/revisions/controller/address";
import {
  PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS,
  PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS,
  PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS,
  PHI_BUILDER_PAGE_META_LAYOUT_IDS,
  PHI_BUILDER_PAGE_META_OVERLAY_IDS,
  PHI_BUILDER_PAGE_META_WIDGET_IDS,
  PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID,
  PHI_BUILDER_MODULES_TABLE_WIDGET_ID,
  PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS,
  PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS,
  PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS,
  PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS,
  PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS,
  PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS,
  PHI_BUILDER_SHELLS_WIDGET_IDS,
  PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS,
  PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS,
  PHI_BUILDER_MODULE_USAGE_WIDGET_IDS,
} from "../../../helpers/cms-page-addresses";
import { PHI_BUILDER_PAGE_META_FORM_ID } from "../../../plugins/runtime-modules/builder/page-meta-form";
import { getPhiBuilderNavigationPageLabels } from "./builder-navigation-label-set";
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
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

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
  "layoutBrandBackgroundPanel",
  "layoutBrandIdentityPanel",
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
  "widgetBrandBackgroundControls",
  "widgetBrandBackgroundPreview",
  "widgetBrandIdentityControls",
  "widgetBrandIdentityPreview",
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

/**
 * The Builder's command toolbar.
 *
 * `restorePreset` is offered only where there is an Area shell to restore, which is the Shells
 * workspace: it deletes the Site's own shell rather than a draft of it, and a command that destructive
 * has no business sitting on a Page or a Theme where it would mean nothing.
 */
function buildBuilderCommandToolbarConfig(
  receiver = createPhiBuilderControllerAddress(),
  options?: { restorePresetLabel?: string | null },
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
      ...(options?.restorePresetLabel
        ? [{
            key: "restorePreset",
            emits: [{ capabilityId: "command", value: "restorePreset" }],
            actionKey: "restore" as const,
            label: options.restorePresetLabel,
            tooltip: options.restorePresetLabel,
            danger: true,
          }]
        : []),
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
  const nodes = createPhiCmsPresetNodes(page);
  const labelOptions = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
  const labels = await getPhiBuilderChromeWidgetLabels(labelOptions);
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
    overlays: [],
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
          /*
           * No Effect of its own, like the ground it does not paint either.
           *
           * An Effect here is authoring, and authoring is exactly what takes a Region out of the Shell
           * Chrome Overlay. A `glass` in this preset made the Builder's own Headers frost while the
           * Sider and Footer beside them took the Site's overlay, which is how one frame came to show
           * two unrelated colour families. What the frame looks like belongs to the Theme.
           */
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
          // No Effect of its own, for the reason given on `header_top` above.
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
          /*
           * No border either, for the reason the Effect went: it is the preset authoring the frame's
           * appearance. It drew a hard light line down the seam between the Sider and the Header
           * column -- measured at 240,240,240 against glass reading 94,93,96 and 96,95,100 on either
           * side of it -- so the one edge inside a single continuous pane was also the most visible
           * thing about it.
           */
          /*
           * No ground of its own, like the Headers above it. A Region paints only what somebody
           * authored, and authoring the container token here covered the Theme Root Background on the
           * one edge of the Builder that is tall enough to show it -- so the Sider stood as an opaque
           * column beside Headers the Background ran through, which is not a chrome at all.
           */
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
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "dev header top three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "dev header main three column",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      nodes.layout({
        typeKey: "flex",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
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
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutSiderLeft,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
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
      nodes.layout({
        typeKey: "content",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutFooterMain,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "dev footer main",
        config: { maxWidth: "100%", margin: 0, padding: 0 },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMainRightActions,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
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
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "select-box",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderAreaSelector,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: "dev builder area selector",
        config: {
          key: "builder-area-selector",
          value: "public",
          /*
           * Disabled is the selector's resting state: only Builder pages that edit one Area at a
           * time arm it, via the workspace controller's "enabled" signal (isPhiAreaScopedBuilderPage
           * holds the opt-in list). The static default also renders on pages nobody armed, and on
           * pages that opted in the SSR baseline matches because the controller enables it on mount.
           */
          disabled: !isPhiAreaScopedBuilderPage(readPhiDeveloperBuilderWorkspaceKey(page.path) ?? "root"),
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
            listens: [
              { routeKey: "builder-area-selection", capabilityId: "change", scope: "area", channel: "areaSelection", action: "change", valueType: "string", receiver: createPhiSignalAddress("cms", SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderAreaSelector) },
              { routeKey: "builder-area-selector-enabled", capabilityId: "enabled", scope: "area", channel: "enabled", action: "change", valueType: "boolean", receiver: createPhiSignalAddress("cms", SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderAreaSelector) },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "page-title",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderPageTitle,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        label: "Page title",
        config: {},
      }),
      nodes.widget({
        typeKey: "account",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopAccount,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: 1,
        sortOrder: 10,
        label: "Account",
        config: {},
      }),
      nodes.widget({
        typeKey: "area-menu",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopAreaMenu,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Area menu",
        config: {},
      }),
      nodes.widget({
        typeKey: "switch",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderMainDebugSwitch,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMainRightActions,
        slotIndex: 0,
        label: "Debug switch",
        config: {
          label: labels.themeSwitch.debug,
          defaultChecked: false,
          key: "debugScaffold",
          /*
           * Disabled is the switch's resting state, the same way the Area selector rests: only the
           * pages that draw a canvas arm it, via the workspace controller's "enabled" signal
           * (isPhiDebugScaffoldBuilderPage holds the opt-in list). A page that forgets to opt in
           * shows a switch that cannot promise something nothing renders.
           */
          disabled: !isPhiDebugScaffoldBuilderPage(readPhiDeveloperBuilderWorkspaceKey(page.path) ?? "root"),
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
            listens: [
              {
                routeKey: "builder-debug-switch-enabled",
                capabilityId: "enabled",
                scope: "area",
                channel: "enabled",
                action: "change",
                valueType: "boolean",
                receiver: createPhiSignalAddress("cms", SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderMainDebugSwitch),
              },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "switch",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopThemeModeSwitch,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 1,
        label: "Theme mode switch",
        config: {
          defaultChecked: runtime.viewer.themeMode === "dark",
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
      }),
      nodes.widget({
        typeKey: "sidebar-navigation",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetSidebarNav,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Sidebar navigation",
        config: {
          side: "left",
          width: 224,
          navKey: "builder:sidebar",
        },
      }),
      nodes.widget({
        typeKey: "simple-text",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetFooterMainText,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutFooterMain,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "dev footer main text",
        config: { text: footerMainText, type: "secondary" },
      }),
    ],
  };
}

async function buildPhiDefaultBuilderPagePresetTemplateTree({
  page,
  runtime,
  registry,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  registry: PhiCmsCompiledDescriptorCatalog;
  presetKey: string;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  /*
   * Which workspace this is, asked of the preset rather than of the path.
   *
   * The path is not the Module's to know: outside Public every route answers under its package, and a
   * Public path can be reassigned when a Module is enabled. The preset key is the identity that does not
   * move -- the same pair the Page is addressed by.
   */
  const isStructurePage = presetKey === "builder-shells-page";
  const isPagesPage = presetKey === "builder-pages-page";
  const isNavigationPage = presetKey === "builder-navigation-page";
  const isRevisionsPage = presetKey === "builder-revisions-page";
  const isModulesPage = presetKey === "builder-modules-page";
  const isMediaPage = presetKey === "builder-media-page";
  const isThemePage = presetKey === "builder-theme-page";
  const revisionsLabels = isRevisionsPage ? await getPhiBuilderRevisionsWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }) : null;
  const modulesLabels = isModulesPage ? await getPhiBuilderModulesPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }) : null;
  const modulesDetailLabels = modulesLabels ? {
    moduleId: modulesLabels.detail.moduleId,
    title: modulesLabels.columns.title,
    description: modulesLabels.columns.description,
    category: modulesLabels.columns.category,
    eligibleAreas: modulesLabels.columns.eligibleAreas,
    baseModule: modulesLabels.detail.baseModule,
    activeAreas: modulesLabels.detail.activeAreas,
    yes: modulesLabels.detail.yes,
    no: modulesLabels.detail.no,
  } : null;
  const navigationLabels = isNavigationPage ? await getPhiBuilderNavigationPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }) : null;
  const mediaLabels = isMediaPage ? await getPhiMediaWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }) : null;
  const builderCommandToolbarConfig = buildBuilderCommandToolbarConfig(
    isThemePage
      ? createPhiThemeControllerAddress()
      : createPhiBuilderControllerAddress(),
    { restorePresetLabel: isStructurePage ? labels.toolbar.restorePreset : null },
  );
  /*
   * The label key, read off the preset rather than off the path for the same reason. `builder-pages-page`
   * is `pages`; a preset from another package that shipped no label falls through to its own words.
   */
  const builderPageKey = presetKey.replace(/^builder-/, "").replace(/-page$/, "") || "dashboard";
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
      /*
       * Everything the Area says about itself, in one place.
       *
       * A modal rather than a drawer because it is answered and left, and it holds no question of its
       * own: the controller opens and closes it on the two commands, and every control inside writes
       * into the structure draft as it is answered.
       */
      ...(isStructurePage ? [{
        id: PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS.overlayAreaSettings,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 0,
        label: "Builder area settings",
        config: {
          title: labels.areaSettings.title,
          width: { compact: "calc(100vw - 32px)", medium: 560, wide: 640 },
          /*
           * Mounted with the Page rather than on first open, because the controls inside show state
           * rather than ask for it.
           *
           * The controller states the Area's four answers when the dialog opens, and a signal is
           * delivered once: whichever mount is standing at that moment gets it, and any later one
           * shows its resting value as though the Area had said so. Under Strict Mode every lazy
           * mount is immediately a remount, which is exactly the case that loses it.
           */
          mountPolicy: "eager",
          closeMode: "immediate",
          signalRoutes: {
            listens: [
              { routeKey: "builder-area-settings-open-dialog", capabilityId: "open", scope: "page", channel: "areaSettingsDialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS.overlayAreaSettings) },
              { routeKey: "builder-area-settings-close-dialog", capabilityId: "close", scope: "page", channel: "areaSettingsDialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS.overlayAreaSettings) },
            ],
          },
        },
      }] : []),
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
          mountPolicy: "lazy-keep",
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
          mountPolicy: "lazy-keep",
          closeMode: "immediate",
          signalRoutes: {
            listens: [
              { routeKey: "builder-module-detail-open", capabilityId: "open", scope: "page", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS.overlayModuleDetail) },
              { routeKey: "builder-module-detail-close", capabilityId: "close", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS.overlayModuleDetail) },
            ],
          },
        },
      }] : []),
      ...(isModulesPage ? [{
        id: PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS.overlayModuleUsage,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 0,
        label: "Builder module usage",
        config: {
          title: modulesLabels?.usage.title ?? "This Module draws on pages",
          width: { compact: "calc(100vw - 32px)", medium: 600, wide: 680 },
          mountPolicy: "lazy-keep",
          closeMode: "immediate",
          signalRoutes: {
            listens: [
              { routeKey: "builder-module-usage-open", capabilityId: "open", scope: "page", channel: "moduleUsageDialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS.overlayModuleUsage) },
              { routeKey: "builder-module-usage-close", capabilityId: "close", scope: "page", channel: "moduleUsageDialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS.overlayModuleUsage) },
            ],
          },
        },
      }] : []),
      ...(isModulesPage ? [{
        id: PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS.overlayPublicRoutes,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 0,
        label: "Builder public route collision",
        config: {
          title: modulesLabels?.publicRoutes.title ?? "Public addresses are taken",
          width: { compact: "calc(100vw - 32px)", medium: 640, wide: 720 },
          mountPolicy: "lazy-keep",
          closeMode: "immediate",
          signalRoutes: {
            emits: [{ routeKey: "builder-public-routes-visibility", capabilityId: "openChange", scope: "area", channel: "publicRoutesVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() }],
            listens: [
              { routeKey: "builder-public-routes-open", capabilityId: "open", scope: "page", channel: "publicRoutesDialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS.overlayPublicRoutes) },
              { routeKey: "builder-public-routes-close", capabilityId: "close", scope: "page", channel: "publicRoutesDialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS.overlayPublicRoutes) },
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
        mountPolicy: "lazy-keep",
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
              routeKey: "builder-media-inspector-open",
              capabilityId: "open",
              scope: "page",
              channel: "dialog",
              action: "open",
              valueType: "none",
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
          mountPolicy: "remount",
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
          mountPolicy: "remount",
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
                // No Effect of its own, for the reason given on `header_top` above.
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
            nodes.layout({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
      /*
       * The workspace content root, one shape per Builder page and none of them painting a ground.
       * The Theme's Root Background is what a workspace shows behind its panels, and a plate here
       * would cover exactly that. A panel that wants its own ground paints it on its own node.
       */
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
                background: "transparent",
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
                  background: "transparent",
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
                  background: "transparent",
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
                  background: "transparent",
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
                  background: "transparent",
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
                background: "transparent",
              },
            },
      ),
      ...((isStructurePage || isPagesPage)
        ? [
            nodes.layout({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 0,
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorHeader,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            nodes.layout({
              typeKey: "collapsible",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorFooter,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              label: "dev media inspector footer",
              config: {},
            }),
            nodes.layout({
              typeKey: "content",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectBody,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectFooter,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              label: "Asset focal rectangle footer",
              config: {},
            }),
            nodes.layout({
              typeKey: "content",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateBody,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
              typeKey: "flex",
              id: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateFooter,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              label: "Create asset folder footer",
              config: {},
            }),
          ]
        : []),
      ...(isModulesPage ? [
        nodes.layout({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageBody,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder module usage body",
          config: {
            gap: PHI_SPACE.base,
            padding: PHI_SPACE.base,
            width: "100%",
            background: PHI_COLOR.bgLayout,
            border: "none",
          },
        }),
        nodes.layout({
          creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
          typeKey: "flex",
          id: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageFooter,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder module usage footer",
          config: {},
        }),
        nodes.layout({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesBody,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder public route collision body",
          config: {
            gap: PHI_SPACE.base,
            padding: PHI_SPACE.base,
            width: "100%",
            background: PHI_COLOR.bgLayout,
            border: "none",
          },
        }),
        nodes.layout({
          creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
          typeKey: "flex",
          id: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesFooter,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder public route collision footer",
          config: {},
        }),
        nodes.layout({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS.body,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
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
      ...(isStructurePage ? [
        /*
         * The form is the container, not the decoration.
         *
         * It states the label column once and everything inside inherits it, which is what makes four
         * labelled Controls read as two columns rather than four differently indented rows.
         */
        nodes.layout({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsBody,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder area settings body",
          config: {
            padding: PHI_SPACE.base,
            background: PHI_COLOR.bgLayout,
            border: "none",
          },
        }),
        nodes.layout({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
          parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsBody,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder area settings fields",
          config: {
            gap: PHI_SPACE.base,
            width: "100%",
            background: "transparent",
            border: "none",
          },
        }),
        nodes.layout({
          creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
          typeKey: "flex",
          id: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFooter,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder area settings footer",
          config: {},
        }),
      ] : []),
      ...(isPagesPage ? [
        nodes.layout({
          creationPreset: { layoutKind: "verticalflex", preset: "panel" },
          typeKey: "flex-vertical",
          id: PHI_BUILDER_PAGE_META_LAYOUT_IDS.body,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder page metadata body",
          config: {
            gap: PHI_SPACE.base,
            padding: PHI_SPACE.base,
            width: "100%",
            background: PHI_COLOR.bgLayout,
            border: "none",
          },
        }),
        nodes.layout({
          creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
          typeKey: "flex",
          id: PHI_BUILDER_PAGE_META_LAYOUT_IDS.footer,
          parentLayoutNodeId: null,
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: "Builder page metadata footer",
          config: {},
        }),
      ] : []),
      ...(isThemePage
        ? [
            nodes.layout({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandControlsHeader,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 0,
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
            nodes.layout({
              typeKey: "stack",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandCardsRow,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
              sortOrder: 0,
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStylePanel,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
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
            /*
             * The label is the Segmented's third entry: it reads the Stack's slots and takes the label
             * of the first child in each, so naming this one is all the Segmented needs.
             */
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandBackgroundPanel,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
              sortOrder: 2,
              label: "Background",
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
            nodes.layout({
              creationPreset: { layoutKind: "flex", preset: "panel" },
              typeKey: "flex",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandIdentityPanel,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStack,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[3].slotIndex,
              sortOrder: 3,
              label: "Brand",
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
        nodes.widget({
          typeKey: "form",
          id: PHI_BUILDER_PAGE_META_WIDGET_IDS.form,
          parentLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.body,
          slotIndex: 0,
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
        }),
        nodes.widget({
          typeKey: "command-toolbar",
          id: PHI_BUILDER_PAGE_META_WIDGET_IDS.commands,
          parentLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.footer,
          slotIndex: 0,
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
        }),
      ] : []),
      ...(isMediaPage
        ? [
            nodes.widget({
              typeKey: "collection-view",
              id: PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaPreview,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 0,
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
            }),
            nodes.widget({
              typeKey: "image-inspector",
              id: PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaInspector,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
              sortOrder: 0,
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
            }),
            nodes.widget({
              typeKey: "form",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
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
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
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
            }),
            nodes.widget({
              typeKey: "command-toolbar",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaInspectorCommands,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            }),
            nodes.widget({
              typeKey: "asset-focal-rect",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFocalRect,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectBody,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            }),
            nodes.widget({
              typeKey: "form",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateForm,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateBody,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
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
            }),
            nodes.widget({
              typeKey: "command-toolbar",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateCommands,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            }),
            nodes.widget({
              typeKey: "command-toolbar",
              id: PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFocalRectCommands,
              parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
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
            }),
          ]
        : []),
      ...(isStructurePage
        ? [
            nodes.widget({
              typeKey: "switch",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetStructureSiderFullHeightSwitch,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
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
            }),
            /*
             * Where the Area's `/` goes.
             *
             * A plain Select, in the Area settings dialog rather than in the header it used to share
             * with the Sider switch: it is a statement about the Area being edited rather than about
             * anything on the canvas, and the header is where the canvas is worked on. The choices are
             * the Area's own registered Pages plus the two answers that are not a Page, and what a
             * choice stores is a Page reference rather than a path.
             */
            nodes.widget({
              typeKey: "select-box",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetAreaRootRoute,
              parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
              sortOrder: 0,
              label: "Area root route select",
              config: {
                key: "areaRootRoute",
                size: { width: "100%" },
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
            }),
            /*
             * Which landing stands at `/`, when a Module offers one.
             *
             * The other half of the Select beside it: that one says what the root does, this one says
             * which of the applications for the slot is answered. It is disabled until the first says
             * "landing", and it lists offers rather than Pages -- a Module that declares `/` is
             * applying, and only the ones that say they mean it are candidates. Empty is an answer
             * too: nobody offers one here, and the root then draws the empty tree /pages authors.
             */
            nodes.widget({
              typeKey: "select-box",
              id: PHI_BUILDER_SHELLS_WIDGET_IDS.widgetAreaLandingPage,
              parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 1,
              label: "Area landing page select",
              config: {
                key: "areaLandingPage",
                size: { width: "100%" },
                label: labels.rootRoute.landingPage,
                placeholder: labels.rootRoute.landingPageEmpty,
                allowClear: true,
                options: [],
                optionsProvider: {
                  providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.landingPage,
                  params: {
                    adoptedLabel: labels.rootRoute.landingPageAdopted,
                    emptyLabel: labels.rootRoute.landingPageEmpty,
                  },
                },
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-area-landing-page-change",
                      capabilityId: "change",
                      scope: "area",
                      channel: "landingPage",
                      action: "change",
                      valueType: "string",
                      receiver: createPhiBuilderControllerAddress(),
                    },
                  ],
                  listens: [
                    {
                      routeKey: "builder-area-landing-page-enabled",
                      capabilityId: "enabled",
                      scope: "page",
                      channel: "enabled",
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiSignalAddress("cms", PHI_BUILDER_SHELLS_WIDGET_IDS.widgetAreaLandingPage),
                    },
                  ],
                },
              },
            }),
            /*
             * What the Area writes into the title of every Page it draws.
             *
             * Two fields under their own heading, above the search-engine switches and separate from
             * them, because they are a different question answered by different Areas: the switches are
             * about Public being found, these are about what stands in the browser tab, and the Admin
             * wants its own answer to that. Both may be left alone -- an Area that says nothing here
             * still gets titles -- which is why the placeholders state the resting value rather than
             * repeating the label.
             */
            nodes.widget({
              typeKey: "simple-text",
              id: PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsTitlesTitle,
              parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
              sortOrder: 2,
              label: "Area settings titles title",
              config: {
                text: labels.areaSettings.titlesTitle,
                strong: true,
              },
            }),
            ...([
              [
                PHI_BUILDER_SHELLS_WIDGET_IDS.widgetAreaTitleTemplate,
                "areaTitleTemplate",
                "titleTemplate",
                labels.areaSettings.titleTemplate,
                labels.areaSettings.titleTemplatePlaceholder,
                3,
              ],
              [
                PHI_BUILDER_SHELLS_WIDGET_IDS.widgetAreaDefaultTitle,
                "areaDefaultTitle",
                "defaultTitle",
                labels.areaSettings.defaultTitle,
                labels.areaSettings.defaultTitlePlaceholder,
                4,
              ],
            ] as const).map(([id, key, channel, label, placeholder, sortOrder]) =>
              nodes.widget({
                typeKey: "input",
                id,
                parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
                slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[sortOrder].slotIndex,
                sortOrder,
                label: `Area settings ${key}`,
                config: {
                  key,
                  label,
                  placeholder,
                  size: { width: "100%" },
                  text: "",
                  inputType: "text",
                  allowClear: true,
                  trimEmittedValue: true,
                  /*
                   * Long enough that a word is one edit rather than five, short enough that the answer
                   * is in the draft before anyone reaches for Save. Without it every keystroke would be
                   * its own entry in the undo stack.
                   */
                  debounceMs: 400,
                  signalRoutes: {
                    emits: [{
                      routeKey: `builder-${channel}-change`,
                      capabilityId: "change",
                      scope: "area",
                      channel,
                      action: "change",
                      valueType: "string",
                      receiver: createPhiBuilderControllerAddress(),
                    }],
                    listens: [{
                      routeKey: `builder-${channel}-value`,
                      capabilityId: "change",
                      scope: "page",
                      channel: "titleValue",
                      action: "change",
                      valueType: "string",
                      receiver: createPhiSignalAddress("cms", id),
                    }],
                  },
                },
              })),
            /*
             * What the Area says about being found, and who may say it.
             *
             * Two switches under a heading, because they are a different subject from the root route
             * and a form that runs them together would read as one. Both are shown in every Area and
             * answerable in none but Public -- the controller says which by signal, as it does for the
             * landing Select -- and outside Public they stand at what is actually the case.
             */
            nodes.widget({
              typeKey: "simple-text",
              id: PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsSeoTitle,
              parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[5].slotIndex,
              sortOrder: 5,
              label: "Area settings SEO title",
              config: {
                text: labels.areaSettings.seoTitle,
                strong: true,
              },
            }),
            ...([
              [
                PHI_BUILDER_SHELLS_WIDGET_IDS.widgetAreaSeoIndex,
                "areaMetaIndex",
                "seoIndex",
                labels.areaSettings.seoIndex,
                PHI_AREA_META_PUBLIC_DEFAULTS.index,
                6,
              ],
              [
                PHI_BUILDER_SHELLS_WIDGET_IDS.widgetAreaSeoSitemap,
                "areaMetaSitemap",
                "seoSitemap",
                labels.areaSettings.seoSitemap,
                PHI_AREA_META_PUBLIC_DEFAULTS.sitemap,
                7,
              ],
            ] as const).map(([id, key, channel, label, defaultChecked, sortOrder]) =>
              nodes.widget({
                typeKey: "switch",
                id,
                parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
                slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[sortOrder].slotIndex,
                sortOrder,
                label: `Area settings ${key}`,
                config: {
                  key,
                  label,
                  /*
                   * A switch is intrinsically sized, and in a form that is exactly wrong: the row has
                   * to be as wide as the others or its label column is a third of nothing. Said as
                   * the block size it is, rather than by teaching the Control about forms.
                   */
                  size: { width: "100%" },
                  /*
                   * The resting state, and only that: what the Area actually says arrives by signal
                   * before anyone sees the dialog. It matches the reader's default so the two never
                   * disagree in the moment between the render and the controller's first word.
                   */
                  defaultChecked,
                  signalRoutes: {
                    emits: [{
                      routeKey: `builder-${channel}-change`,
                      capabilityId: "change",
                      scope: "area",
                      channel,
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiBuilderControllerAddress(),
                    }],
                    listens: [{
                      routeKey: `builder-${channel}-value`,
                      capabilityId: "change",
                      scope: "page",
                      channel: "seoValue",
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiSignalAddress("cms", id),
                    }, {
                      routeKey: `builder-${channel}-enabled`,
                      capabilityId: "enabled",
                      scope: "page",
                      channel: "enabled",
                      action: "change",
                      valueType: "boolean",
                      receiver: createPhiSignalAddress("cms", id),
                    }],
                  },
                },
              })),
            /*
             * Where the header's third column went.
             *
             * One button rather than the two Selects that used to stand here: the header is about the
             * canvas, and everything the Area says about itself is one click away instead of spread
             * across a row that grew every time the Area gained a sentence.
             */
            nodes.widget({
              typeKey: "command-toolbar",
              id: PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsAction,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 0,
              label: "dev area settings action",
              config: {
                key: "areaSettingsAction",
                compact: true,
                wrap: false,
                showLabels: true,
                buttons: [{
                  key: "areaSettings",
                  emits: [{ capabilityId: "command", value: "open" }],
                  label: labels.areaSettings.action,
                  tooltip: labels.areaSettings.action,
                  icon: "setting",
                }],
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-area-settings-open",
                    capabilityId: "command",
                    scope: "area",
                    channel: "areaSettings",
                    action: "activate",
                    valueType: "string",
                    receiver: createPhiBuilderControllerAddress(),
                  }],
                },
              },
            }),
            nodes.widget({
              typeKey: "command-toolbar",
              id: PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsCommands,
              parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFooter,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              label: "Area settings commands",
              config: {
                key: "area-settings-commands",
                compact: false,
                wrap: true,
                showLabels: true,
                controlSize: "medium",
                /*
                 * One button, and it says "done" rather than "save".
                 *
                 * Every control in here writes into the draft the moment it is answered, exactly as it
                 * did while it stood in the header, so there is nothing left to confirm -- and a Save
                 * beside controls that already saved would be a second, wrong sentence about when a
                 * change takes effect.
                 */
                buttons: [{
                  key: "close",
                  emits: [{ capabilityId: "command", value: "close" }],
                  actionKey: "save",
                  buttonType: "primary" as const,
                  label: labels.areaSettings.close,
                }],
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-area-settings-close",
                    capabilityId: "command",
                    scope: "area",
                    channel: "areaSettings",
                    action: "activate",
                    valueType: "string",
                    receiver: createPhiBuilderControllerAddress(),
                  }],
                },
              },
            }),
            nodes.widget({
              typeKey: "command-toolbar",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 0,
              label: "dev structure toolbar",
              config: builderCommandToolbarConfig,
            }),
          ]
        : isPagesPage
          ? [
              nodes.widget({
                typeKey: "cascader",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesHeaderSelector,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
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
              }),
              nodes.widget({
                typeKey: "input",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesHeaderTitle,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
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
              }),
              nodes.widget({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetPagesMetaToolbar,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutWorkspaceHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
                sortOrder: 0,
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
              }),
              nodes.widget({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                label: "dev pages toolbar",
                config: builderCommandToolbarConfig,
              }),
            ]
        : isThemePage
          ? [
              nodes.widget({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                label: "dev brand toolbar",
                config: builderCommandToolbarConfig,
              }),
              nodes.widget({
                typeKey: "select-box",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandContextSelect,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
                label: "Brand set select",
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
                      /*
                       * The Site Theme entry names the Set the stored Theme was derived from; a save
                       * stores another Theme, so the Controller states the list again.
                       */
                      {
                        routeKey: "brand-theme-select-options",
                        capabilityId: "options",
                        scope: "area",
                        channel: PHI_THEME_SIGNAL_CHANNELS.presetOptions,
                        action: "change",
                        valueType: "json",
                        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.controlOptions,
                        receiver: "broadcast",
                      },
                    ],
                  },
                  options: [
                    buildPhiSiteThemeSelectOption({
                      siteKey: runtime.site.key,
                      siteName: runtime.site.name,
                      theme: runtime.site.theme,
                    }),
                    ...buildPhiThemeSetSelectOptions(registry),
                  ],
                },
              }),
              nodes.widget({
                typeKey: "switch",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandPreviewModeSwitch,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandControlsHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
                sortOrder: 0,
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
              }),
              nodes.widget({
                typeKey: "segmented",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetThemeStackSegmented,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandControlsHeader,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
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
              }),
            ]
        : isModulesPage
          ? [
              nodes.widget({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                label: "dev modules toolbar",
                config: builderCommandToolbarConfig,
              }),
              nodes.widget({
                typeKey: "table",
                id: PHI_BUILDER_MODULES_TABLE_WIDGET_ID,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 0,
                label: "dev modules table",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
                    resourceKey: "modules",
                    params: {
                      categoryLabels: modulesLabels?.categories ?? null,
                      missingLabels: modulesLabels
                        ? { missing: modulesLabels.missing.category, missingHint: modulesLabels.missing.hint }
                        : null,
                      areaLabels: modulesLabels?.areas ?? null,
                      usageLabels: modulesLabels ? { shell: modulesLabels.usage.shell } : null,
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
                      /*
                       * One checkbox column per Area: the switch is the Module everywhere, these are
                       * the per-Area refinement. A Module not eligible for an Area carries null there
                       * and the cell renders empty; the Area whose Base module the row is stays
                       * checked and disabled.
                       */
                      ...PHI_CMS_AREA_KEYS.map((areaKey) => ({
                        key: `area_${areaKey}`,
                        fieldKey: `area_${areaKey}`,
                        title: modulesLabels?.areas[areaKey] ?? areaKey,
                        align: "center" as const,
                        editor: {
                          control: "checkbox" as const,
                          disabledWhen: {
                            source: "row" as const,
                            valuePath: "baseAreaKey",
                            operator: "equals" as const,
                            value: areaKey,
                          },
                        },
                      })),
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
                    /*
                     * Both filters are the table's own view Controls, in front of its search box: they
                     * narrow which Modules are listed and never what a switch or checkbox does. That is
                     * also why neither is the header Area selector, whose meaning is "the Area being
                     * edited". The Area select carries no title of its own -- it reads "All areas" until
                     * it says otherwise -- while the switch takes its label in front of it, since a bare
                     * switch says nothing. Foundation Modules, the ones that carry the Areas themselves,
                     * stay out until asked for: they are scaffolding rather than a choice.
                     */
                    filters: [
                      {
                        key: PHI_BUILDER_MODULES_TABLE_FILTER_KEYS.area,
                        type: "select",
                        label: modulesLabels?.filter.area ?? "Area",
                        labelPlacement: "none",
                        defaultValue: PHI_BUILDER_MODULES_TABLE_ALL_AREAS_VALUE,
                        options: [
                          {
                            value: PHI_BUILDER_MODULES_TABLE_ALL_AREAS_VALUE,
                            label: modulesLabels?.filter.allAreas ?? "All areas",
                          },
                          ...PHI_CMS_AREA_KEYS.map((areaKey) => ({
                            value: areaKey,
                            label: modulesLabels?.areas[areaKey] ?? areaKey,
                          })),
                        ],
                      },
                      {
                        key: PHI_BUILDER_MODULES_TABLE_FILTER_KEYS.showFoundation,
                        type: "boolean",
                        control: "switch",
                        label: modulesLabels?.filter.showFoundation ?? "Foundations",
                        labelPlacement: "inline",
                        defaultValue: false,
                      },
                    ],
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
              }),
              nodes.widget({
                typeKey: "simple-text",
                id: PHI_BUILDER_MODULE_USAGE_WIDGET_IDS.moduleUsageIntro,
                parentLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageBody,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                label: "Builder module usage intro",
                config: {
                  text: modulesLabels?.usage.intro ?? "",
                  type: "secondary",
                },
              }),
              nodes.widget({
                typeKey: "table",
                id: PHI_BUILDER_MODULE_USAGE_WIDGET_IDS.moduleUsageTable,
                parentLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageBody,
                slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                sortOrder: 1,
                label: "Builder module usage rows",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
                    resourceKey: "moduleUsage",
                    params: {},
                  },
                  presentation: {
                    bordered: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      { key: "area", fieldKey: "area", title: modulesLabels?.usage.area ?? "Area", sizing: { mode: "content" } },
                      { key: "where", fieldKey: "where", title: modulesLabels?.usage.where ?? "Page", sizing: { mode: "fill", minWidth: 200 } },
                      { key: "blocks", fieldKey: "blocks", title: modulesLabels?.usage.blocks ?? "Blocks", align: "right" as const, sizing: { mode: "content" } },
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
                      { routeKey: "builder-module-usage-reload", capabilityId: "reload", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_MODULE_USAGE_WIDGET_IDS.moduleUsageTable) },
                    ],
                  },
                },
              }),
              nodes.widget({
                typeKey: "command-toolbar",
                id: PHI_BUILDER_MODULE_USAGE_WIDGET_IDS.moduleUsageCommands,
                parentLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageFooter,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                label: "Builder module usage commands",
                config: {
                  key: "module-usage-commands",
                  compact: false,
                  wrap: true,
                  showLabels: true,
                  controlSize: "medium",
                  buttons: [
                    { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: modulesLabels?.usage.cancel ?? "Keep it on" },
                    { key: "confirm", emits: [{ capabilityId: "command", value: "confirm" }], actionKey: "save", buttonType: "primary" as const, label: modulesLabels?.usage.confirm ?? "Switch off anyway" },
                  ],
                  signalRoutes: {
                    emits: [{
                      routeKey: "builder-module-usage-command",
                      capabilityId: "command",
                      scope: "area",
                      channel: "moduleUsage",
                      action: "activate",
                      valueType: "string",
                      receiver: createPhiBuilderControllerAddress(),
                    }],
                  },
                },
              }),
              nodes.widget({
                typeKey: "simple-text",
                id: PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS.publicRoutesIntro,
                parentLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesBody,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                label: "Builder public route collision intro",
                config: {
                  text: modulesLabels?.publicRoutes.intro ?? "",
                  type: "secondary",
                },
              }),
              nodes.widget({
                typeKey: "table",
                id: PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS.publicRoutesTable,
                parentLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesBody,
                slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                sortOrder: 1,
                label: "Builder public route collision rows",
                config: {
                  source: {
                    providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
                    resourceKey: "publicRouteCollisions",
                    params: {},
                  },
                  presentation: {
                    bordered: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      { key: "title", fieldKey: "title", title: modulesLabels?.publicRoutes.page ?? "Page" },
                      { key: "declaredPath", fieldKey: "declaredPath", title: modulesLabels?.publicRoutes.wanted ?? "Wanted", renderer: "code", sizing: { mode: "content" } },
                      { key: "heldBy", fieldKey: "heldBy", title: modulesLabels?.publicRoutes.heldBy ?? "Taken by" },
                      {
                        key: "path",
                        fieldKey: "path",
                        title: modulesLabels?.publicRoutes.address ?? "Address",
                        sizing: { mode: "fill", minWidth: 200 },
                        editor: { mode: "inline", control: "text" },
                      },
                    ],
                    controlSize: "small",
                  },
                  features: {
                    pagination: { enabled: false, pageSize: 20, showSizeChanger: false },
                    sorting: { mode: "none" },
                    editing: { mode: "cell" },
                    tools: { mode: "self-contained", reset: false, reload: false },
                  },
                  signalRoutes: {
                    listens: [
                      { routeKey: "builder-public-routes-reload", capabilityId: "reload", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS.publicRoutesTable) },
                    ],
                  },
                },
              }),
              nodes.widget({
                typeKey: "command-toolbar",
                id: PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS.publicRoutesCommands,
                parentLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesFooter,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
                label: "Builder public route collision commands",
                config: {
                  key: "public-routes-commands",
                  compact: false,
                  wrap: true,
                  showLabels: true,
                  controlSize: "medium",
                  buttons: [
                    { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: modulesLabels?.publicRoutes.cancel ?? "Cancel" },
                    { key: "assign", emits: [{ capabilityId: "command", value: "assign" }], actionKey: "save", buttonType: "primary" as const, label: modulesLabels?.publicRoutes.assign ?? "Enable" },
                  ],
                  signalRoutes: {
                    emits: [{
                      routeKey: "builder-public-routes-command",
                      capabilityId: "command",
                      scope: "area",
                      channel: "publicRoutes",
                      action: "activate",
                      valueType: "string",
                      receiver: createPhiBuilderControllerAddress(),
                    }],
                  },
                },
              }),
              nodes.widget({
                typeKey: "table",
                id: PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS.fields,
                parentLayoutNodeId: PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS.body,
                slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
                sortOrder: 0,
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
              }),
            ]
        : isNavigationPage
          ? [
              nodes.widget({
                typeKey: "command-toolbar",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetToolbar,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
                slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
                sortOrder: 0,
                label: "dev navigation toolbar",
                config: builderCommandToolbarConfig,
              }),
              nodes.widget({
                typeKey: "tree",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetNavigationSource,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 0,
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
              }),
              nodes.widget({
                typeKey: "table",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetNavigationItems,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 1,
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
                          // No confirmation: the Navigation workspace has Undo, which takes a delete back.
                          execution: "provider",
                        },
                      ],
                    },
                  },
                },
              }),
            ]
        : isRevisionsPage
          ? [
              nodes.widget({
                typeKey: "table",
                id: PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 0,
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
              }),
            ]
        : []),
      ...((isStructurePage || isPagesPage)
        ? [
            nodes.widget({
              typeKey: "builder-mode-switch",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetBuilderModeSwitch,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              label: "dev builder mode switch",
              config: {},
            }),
          ]
        : []),
      ...((isStructurePage || isPagesPage || isNavigationPage || isThemePage || isModulesPage)
        ? [
            nodes.widget({
              typeKey: "builder-draft-status",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetDraftStatus,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 0,
              label: isThemePage ? "builder brand draft status" : "builder draft status",
              config: {},
            }),
          ]
        : []),
      ...(isStructurePage
        ? [
            nodes.widget({
              typeKey: "builder-shells-workspace",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetCanvas,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
              slotIndex: 1,
              sortOrder: 0,
              label: "dev shells workspace",
              config: {},
            }),
          ]
        : isPagesPage
          ? [
              nodes.widget({
                typeKey: "builder-pages-workspace",
                id: SYNTHETIC_DEV_WIDGET_IDS.widgetCanvas,
                parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
                slotIndex: 1,
                sortOrder: 0,
                label: "dev pages workspace",
                config: {},
              }),
            ]
        : isMediaPage
          ? []
          : isThemePage
            ? [
                nodes.widget({
                  typeKey: "builder-brand-theme-controls",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandThemeControls,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandCardsRow,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
                  sortOrder: 0,
                  label: "dev brand theme controls",
                  config: {
                    themeKey: "default",
                    minSize: { width: 300 },
                    maxSize: { width: 400 },
                  },
                }),
                nodes.widget({
                  typeKey: "builder-brand-theme-preview",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandThemePreview,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandCardsRow,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                  sortOrder: 1,
                  label: "dev brand theme preview",
                  config: {
                    themeKey: "default",
                    minSize: { width: 360 },
                  },
                }),
                nodes.widget({
                  typeKey: "builder-brand-style-controls",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandStyleControls,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStylePanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
                  sortOrder: 0,
                  label: "dev brand style controls",
                  config: {
                    themeKey: "default",
                    minSize: { width: 300 },
                    maxSize: { width: 400 },
                  },
                }),
                nodes.widget({
                  typeKey: "builder-brand-background-controls",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandBackgroundControls,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandBackgroundPanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
                  sortOrder: 0,
                  label: "dev brand background controls",
                  config: {
                    themeKey: "default",
                    // The three Theme panels share one slot, so they share one width. A wider Background
                    // panel widened the slot itself and the column jumped whenever it was selected.
                    minSize: { width: 300 },
                    maxSize: { width: 400 },
                  },
                }),
                nodes.widget({
                  typeKey: "builder-brand-theme-preview",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandBackgroundPreview,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandBackgroundPanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                  sortOrder: 1,
                  label: "dev brand background preview",
                  config: {
                    themeKey: "default",
                    minSize: { width: 360 },
                  },
                }),
                nodes.widget({
                  typeKey: "builder-brand-theme-preview",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandStylePreview,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandStylePanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                  sortOrder: 1,
                  label: "dev brand style preview",
                  config: {
                    themeKey: "default",
                    minSize: { width: 360 },
                  },
                }),
                nodes.widget({
                  typeKey: "builder-brand-identity-controls",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandIdentityControls,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandIdentityPanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
                  sortOrder: 0,
                  label: "dev brand identity controls",
                  config: {
                    themeKey: "default",
                    minSize: { width: 300 },
                    maxSize: { width: 400 },
                  },
                }),
                /*
                 * The fourth instance of the one Preview Widget, not a fourth Preview.
                 *
                 * The Stack mounts only its active slot, so exactly one of them is alive at a time; a
                 * freshly mounted one asks the Controller for the draft rather than waiting for the next
                 * broadcast. Standing beside its own panel is the whole reason there is more than one.
                 */
                nodes.widget({
                  typeKey: "builder-brand-theme-preview",
                  id: SYNTHETIC_DEV_WIDGET_IDS.widgetBrandIdentityPreview,
                  parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutBrandIdentityPanel,
                  slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
                  sortOrder: 1,
                  label: "dev brand identity preview",
                  config: {
                    themeKey: "default",
                    minSize: { width: 360 },
                  },
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
  ownerModuleId,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  registry: PhiCmsCompiledDescriptorCatalog;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
}) {
  return remapBuilderPresetTreeInstanceIds(
    await buildPhiDefaultBuilderPagePresetTemplateTree({
      page,
      runtime,
      registry,
      presetKey,
    }),
    ownerModuleId,
    presetKey,
  );
}
