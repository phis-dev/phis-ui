import {
  createPhiPresetCmsInstanceIdMap,
  type PhiCmsInstanceId,
} from "../../../../types/cms-instance-id";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../../constants/phi-cms";
import { PHI_CMS_AREA_KEYS } from "../../../../constants/cms-areas";
import { buildPhiCmsLayoutNode } from "../../../../helpers/cms-node-factories";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { buildPhiHeaderTopActionsLayoutNode } from "../../../../components/regions/presets/phi-header-top-actions-layout";
import { remapPhiSignalRoutesInConfig } from "../../../../helpers/signal-route-lifecycle";
import { resolvePhiShellHeaderHeight, resolvePhiShellMetric } from "../../../../helpers/shell-region-style";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiCommandToolbarWidgetPlacement } from "../../../../types/core-widget-placements";
import type { PhiRuntimeModuleId } from "../../../../types/cms-module-descriptors";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
  type PhiBlockRuntime,
} from "../../../../types";
import { PHI_LAYOUT } from "../../../../theme/phi-tokens";
import { PHI_COLOR, PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { createPhiBuilderControllerAddress } from "../controller/address";
import {
  isPhiAreaScopedBuilderPage,
  isPhiDebugScaffoldBuilderPage,
  readPhiDeveloperBuilderWorkspaceKey,
} from "../route-scope";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  PHI_BUILDER_MODULES_TABLE_ALL_AREAS_VALUE,
  PHI_BUILDER_MODULES_TABLE_FILTER_KEYS,
} from "../data-providers";
import { PHI_BUILDER_NAVIGATION_DND_TYPE_PAGE } from "../../../../constants/builder-navigation-dnd";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../area-module-defaults";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/builder-chrome";
import type { PhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-types/builder-chrome";
import { getPhiRegionWidgetLabels } from "../../../../components/widgets/label-sets/region";
import { PHI_REGION_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/region";
import { getPhiBuilderModulesPageLabels } from "../../../../components/widgets/label-sets/builder-modules";
import {
  PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS,
  PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS,
  PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS,
  PHI_BUILDER_PAGE_META_LAYOUT_IDS,
  PHI_BUILDER_PAGE_META_OVERLAY_IDS,
  PHI_BUILDER_PAGE_META_WIDGET_IDS,
  PHI_BUILDER_MODULES_TABLE_WIDGET_ID,
  PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS,
  PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS,
  PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS,
  PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS,
  PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS,
  PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS,
  PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS,
  PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS,
  PHI_BUILDER_MODULE_USAGE_WIDGET_IDS,
} from "../addresses";
import { PHI_BUILDER_PAGE_META_FORM_ID } from "../page-meta-form";
import { PHI_BUILDER_AREA_SETTINGS_FORM_ID } from "../area-settings-form";
import { getPhiBuilderNavigationPageLabels } from "./builder-navigation-label-set";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

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
  "widgetBuilderAreaSelector",
  "widgetBuilderModeSwitch",
  "widgetHeaderMainDebugSwitch",
  "widgetHeaderTopThemeModeSwitch",
  "widgetHeaderTopAccount",
  "widgetBuilderPageTitle",
  "widgetPagesHeaderTitle",
  "widgetPagesMetaToolbar",
  "widgetPagesHeaderSelector",
] as const;

const SYNTHETIC_DEV_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
}, PHI_BUILDER_WIDGET_NODE_KEYS);


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
 * The Builder's command toolbar: save, preview, publish, and the steps back.
 *
 * Deleting an Area's own shell used to sit here too, one button from undo. It is the only act in this
 * workspace that cannot be taken back, and it now lives on the Revisions page, where a Site's stored
 * history is what is being looked at.
 */
function buildBuilderCommandToolbarConfig(
  options?: { disableReset?: boolean },
): PhiCommandToolbarWidgetPlacement {
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
          receiver: createPhiBuilderControllerAddress(),
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
    showLabels: false,
    buttons: [
      { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", variant: "normal" },
      { key: "preview", emits: [{ capabilityId: "command", value: "preview" }], actionKey: "livePreview" },
      { key: "publish", emits: [{ capabilityId: "command", value: "publish" }], actionKey: "publish", variant: "normal" },
      { key: "undo", emits: [{ capabilityId: "command", value: "undo" }], actionKey: "undo" },
      { key: "redo", emits: [{ capabilityId: "command", value: "redo" }], actionKey: "redo" },
      {
        key: "reset",
        emits: [{ capabilityId: "command", value: "reset" }],
        actionKey: "reset",
        ...(options?.disableReset ? { disabled: true } : {}),
      },
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
  const headerTopHeight = resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "top");
  const headerMainHeight = resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main");
  const shellSiderLeftWidth = resolvePhiShellMetric(runtime.site.theme?.shell, "width", {
    family: "sider",
    region: "left",
  });

  return {
    page: nodes.page(),
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
      nodes.region({
        id: SYNTHETIC_DEV_REGION_IDS.regionHeaderTop,
        regionType: PhiCmsRegionType.HeaderTop,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        sortOrder: -10,
        config: {
          sticky: false,
          /*
           * No Effect, Shadow, border, or ground of its own (SHELL.md, Shell Chrome Overlay).
           *
           * Any of them is authoring, and authoring is exactly what takes a Region out of the Shell
           * Chrome Overlay. A `glass` in this preset made the Builder's own Headers frost while the
           * Sider and Footer beside them took the Site's overlay, which is how one frame came to show
           * two unrelated colour families. What the frame looks like belongs to the Theme.
           */
          size: { height: `${headerTopHeight}px` },
          offsetTop: 0,
        },
      }),
      nodes.region({
        id: SYNTHETIC_DEV_REGION_IDS.regionHeaderMain,
        regionType: PhiCmsRegionType.HeaderMain,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderMain,
        sortOrder: 0,
        config: {
          sticky: true,
          // No chrome of its own, for the reason given on `header_top` above.
          size: { height: `${headerMainHeight}px` },
          offsetTop: 0,
        },
      }),
      nodes.region({
        id: SYNTHETIC_DEV_REGION_IDS.regionSiderLeft,
        regionType: PhiCmsRegionType.SiderLeft,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutSiderLeft,
        sortOrder: 10,
        config: {
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
          size: { width: `${shellSiderLeftWidth ?? PHI_LAYOUT.sidebarWidth}px` },
          offsetTop: 0,
        },
      }),
      nodes.region({
        id: SYNTHETIC_DEV_REGION_IDS.regionFooterMain,
        regionType: PhiCmsRegionType.Footer,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutFooterMain,
        sortOrder: 30,
        // No chrome of its own, for the reason given on `header_top` above.
        config: {},
      }),
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
      buildPhiHeaderTopActionsLayoutNode(nodes, {
        id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTopActions,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        label: "dev header top actions",
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
        config: { margin: 0, padding: 0 },
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
        typeKey: "theme-mode-switch",
        id: SYNTHETIC_DEV_WIDGET_IDS.widgetHeaderTopThemeModeSwitch,
        parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 1,
        label: "Theme mode switch",
        config: {},
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
    ],
  };
}

async function buildPhiDefaultBuilderPagePresetTemplateTree({
  page,
  runtime,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
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
  const isModulesPage = presetKey === "builder-modules-page";
  /*
   * The Sider switch says what the canvas beside it says, so it reads it from the same place.
   *
   * It carried its own copy of the caption -- a literal in this tree -- which went out in English while
   * the Region titles above it were translated. `structure.surface.siderFullHeight` is that caption, and
   * a second key holding the same words would have been the same sentence translated twice.
   */
  const structureLabels = isStructurePage ? await getPhiRegionWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }) : null;
  const siderFullHeightLabel = structureLabels?.structure.surface.siderFullHeight
    ?? PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.siderFullHeight;
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
  const builderCommandToolbarConfig = buildBuilderCommandToolbarConfig(
    {
      /*
       * Held shut on the Modules page while what it means there is decided.
       *
       * Everywhere else `reset` now says "start again from what the Module ships". On Modules it means
       * something else entirely -- delete the selection drafts and apply the shared default selection --
       * and that default is not shown anywhere: not as a column, a tag or a tooltip, and not even by the
       * command that applies it. `createPhiDefaultAreaRuntimeModuleIds` is the only place it exists, and
       * a destructive button that silently applies a list nobody can read is worse than no button.
       *
       * Disabled rather than removed, because the choice is between showing the default and dropping the
       * idea from this workspace, and that is not settled.
       */
      disableReset: isModulesPage,
    },
  );
  /*
   * The label key, read off the preset rather than off the path for the same reason. `builder-pages-page`
   * is `pages`; a preset from another package that shipped no label falls through to its own words.
   */
  const builderPageKey = presetKey.replace(/^builder-/, "").replace(/-page$/, "") || "dashboard";
  const builderPageTitleSource = resolveBuilderPageTitleSource(builderPageKey);
  const builderPageTitle = resolveBuilderPageTitle(labels, builderPageKey, builderPageTitleSource);
  return {
    page: nodes.page(),
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
      ...(isStructurePage ? [nodes.overlay({
        id: PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS.overlayAreaSettings,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFooter,
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
      })] : []),
      ...(isPagesPage ? [nodes.overlay({
        id: PHI_BUILDER_PAGE_META_OVERLAY_IDS.editor,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.body,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_BUILDER_PAGE_META_LAYOUT_IDS.footer,
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
      })] : []),
      ...(isModulesPage ? [nodes.overlay({
        id: PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS.overlayModuleDetail,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS.body,
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
      })] : []),
      ...(isModulesPage ? [nodes.overlay({
        id: PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS.overlayModuleUsage,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS.moduleUsageFooter,
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
      })] : []),
      ...(isModulesPage ? [nodes.overlay({
        id: PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS.overlayPublicRoutes,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS.publicRoutesFooter,
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
      })] : []),
    ],
    regions: [
      ...(isStructurePage || isPagesPage || isNavigationPage || isModulesPage
        ? [
            nodes.region({
              id: SYNTHETIC_DEV_REGION_IDS.regionHeaderBottom,
              regionType: PhiCmsRegionType.HeaderBottom,
              rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              sortOrder: 5,
              config: {
                sticky: true,
                // No chrome of its own, for the reason given on `header_top` above.
                size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom")}px` },
                offsetTop: resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main"),
              },
            }),
          ]
        : []),
      nodes.region({
        id: SYNTHETIC_DEV_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutContent,
        sortOrder: 20,
        config: {
          maxSize: { width: "100%" },
          size: { width: "100%" },
          padding: 0,
          margin: 0,
        },
      }),
    ],
    layoutNodes: [
      ...((isStructurePage || isPagesPage || isNavigationPage || isModulesPage)
        ? [
            nodes.layout({
              creationPreset: { layoutKind: "threecol", preset: "panel" },
              typeKey: "three-column",
              id: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              label: "dev header bottom three column",
              config: {
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
                margin: 0,
                padding: PHI_SPACE.base,
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
                  margin: 0,
                  padding: PHI_SPACE.base,
                  paddingTop: PHI_SPACE.base,
                  paddingBottom: PHI_SPACE.base,
                },
              }
          : isModulesPage
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
                label: "dev modules content vertical",
                config: {
                  anchor: {
                    horizontal: "center",
                    vertical: "top",
                  },
                  gap: PHI_SPACE.base,
                  margin: 0,
                  padding: PHI_SPACE.base,
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
                margin: 0,
                padding: 0,
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
                // A header as tall as its content, against the Layout default of filling its slot.
                size: { height: "auto" },
              },
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
            surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
            surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
            surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
            surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
            surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
              { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", variant: "primary" },
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
                label: siderFullHeightLabel,
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
             * Everything the Area says about itself, as one Form.
             *
             * A Form rather than six Controls in a column, for the one thing a Form does that a stack
             * cannot: it states the label column once -- `PHI_FORM_DEFAULT_LAYOUT` puts every caption
             * in tracks 1-9 and every Control in 9-25 -- so the rows line up on an edge of their own
             * instead of each being indented by the width of its own caption. None of the questions
             * changed, and neither did what an answer is stored as.
             *
             * The captions travel in `formConfig` rather than through a Form label set of their own.
             * This preset is server-rendered and already holds the whole translated chrome label set,
             * so reading them from the placement keeps one translation source for the dialog instead
             * of two that would have to be kept saying the same thing.
             *
             * The two headings that used to stand between the groups are gone with the stack. They
             * were there because the rows had no common edge to read down; the label column is that
             * edge, and a heading every second row would now be the thing interrupting it.
             */
            nodes.widget({
              typeKey: "form",
              id: PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsForm,
              parentLayoutNodeId: PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS.areaSettingsFields,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
              sortOrder: 0,
              label: "dev area settings form",
              config: {
                formId: PHI_BUILDER_AREA_SETTINGS_FORM_ID,
                /*
                 * No submit button of its own: the dialog's footer carries the one button this Form
                 * has, and the controller turns that command into the submit -- the arrangement the
                 * Page metadata dialog already uses.
                 */
                execution: { mode: "signal" },
                formConfig: {
                  rootRouteTitle: labels.rootRoute.title,
                  rootRouteAutomatic: labels.rootRoute.automatic,
                  rootRouteLanding: labels.rootRoute.landing,
                  landingPageLabel: labels.rootRoute.landingPage,
                  landingPageEmpty: labels.rootRoute.landingPageEmpty,
                  landingPageAdopted: labels.rootRoute.landingPageAdopted,
                  titleTemplateLabel: labels.areaSettings.titleTemplate,
                  titleTemplatePlaceholder: labels.areaSettings.titleTemplatePlaceholder,
                  defaultTitleLabel: labels.areaSettings.defaultTitle,
                  defaultTitlePlaceholder: labels.areaSettings.defaultTitlePlaceholder,
                  seoIndexLabel: labels.areaSettings.seoIndex,
                  seoSitemapLabel: labels.areaSettings.seoSitemap,
                },
                signalRoutes: {
                  emits: [{
                    routeKey: "builder-area-settings-values",
                    capabilityId: "submitValues",
                    scope: "area",
                    channel: "areaSettingsForm",
                    action: "change",
                    valueType: "json",
                    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
                    receiver: createPhiBuilderControllerAddress(),
                  }],
                  listens: [{
                    routeKey: "builder-area-settings-submit",
                    capabilityId: "submit",
                    scope: "page",
                    channel: "submit",
                    action: "activate",
                    valueType: "none",
                    receiver: createPhiSignalAddress(
                      "cms",
                      PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsForm,
                    ),
                  }],
                },
              },
            }),
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
                /*
                 * The two buttons as one group rather than as two things that happen to stand near
                 * each other: they are the two ends of a single decision, and a gap between them
                 * reads as two unrelated offers.
                 */
                compact: true,
                showLabels: true,
                controlSize: "medium",
                /*
                 * Two buttons, because the Form holds the answers until one of them is pressed.
                 *
                 * The controls used to write into the draft the moment they were answered, and then
                 * there was nothing to confirm and nothing to take back. A Form answers as a record:
                 * "done" asks it for what it holds and the controller writes that, so leaving has to
                 * be sayable as well -- otherwise the only way out of a half-typed dialog is to make
                 * the change.
                 */
                buttons: [{
                  key: "cancel",
                  emits: [{ capabilityId: "command", value: "cancel" }],
                  actionKey: "cancel",
                }, {
                  key: "close",
                  emits: [{ capabilityId: "command", value: "close" }],
                  actionKey: "save",
                  variant: "primary" as const,
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
                      usageLabels: modulesLabels
                        ? { shell: modulesLabels.usage.shell, signIn: modulesLabels.usage.signIn }
                        : null,
                    },
                  },
                  presentation: {
                    borders: true,
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
                    pagination: { enabled: false, pageSize: 200 },
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
                  tone: "secondary",
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
                    borders: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      { key: "area", fieldKey: "area", title: modulesLabels?.usage.area ?? "Area", sizing: { mode: "content" } },
                      { key: "where", fieldKey: "where", title: modulesLabels?.usage.where ?? "Page", sizing: { mode: "fill", minWidth: 200 } },
                      { key: "blocks", fieldKey: "blocks", title: modulesLabels?.usage.blocks ?? "Blocks", align: "right" as const, sizing: { mode: "content" } },
                    ],
                    controlSize: "small",
                  },
                  features: {
                    pagination: { enabled: false, pageSize: 50 },
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
                    { key: "confirm", emits: [{ capabilityId: "command", value: "confirm" }], actionKey: "save", variant: "primary" as const, label: modulesLabels?.usage.confirm ?? "Switch off anyway" },
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
                  tone: "secondary",
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
                    borders: true,
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
                        editor: {},
                      },
                    ],
                    controlSize: "small",
                  },
                  features: {
                    pagination: { enabled: false, pageSize: 20 },
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
                    { key: "assign", emits: [{ capabilityId: "command", value: "assign" }], actionKey: "save", variant: "primary" as const, label: modulesLabels?.publicRoutes.assign ?? "Enable" },
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
                    borders: true,
                    layout: { mode: "auto", overflowX: "auto" },
                    columns: [
                      { key: "label", fieldKey: "label", title: modulesLabels?.detail.field ?? "Field" },
                      { key: "value", fieldKey: "value", title: modulesLabels?.detail.value ?? "Value", sizing: { mode: "fill" } },
                    ],
                    /*
                     * Where the Module runs stands under the list rather than in it: the rows say what
                     * the Module is, which is the same on every Site, and this says what this Site did
                     * with it.
                     *
                     * A summary row rather than the free-text footer, so it keeps the columns the list
                     * is read in -- caption left, answer right, under the same two headings. The footer
                     * would have set the same sentence adrift across the full width.
                     */
                    summary: {
                      placement: "body-end" as const,
                      rows: [{
                        key: "activeAreas",
                        cells: [
                          { key: "label", columnKey: "label", item: { key: "activeAreasLabel", value: { source: "provider" as const, fieldKey: "activeAreasLabel" } } },
                          { key: "value", columnKey: "value", item: { key: "activeAreas", value: { source: "provider" as const, fieldKey: "activeAreas" } } },
                        ],
                      }],
                    },
                    controlSize: "small",
                  },
                  features: {
                    pagination: { enabled: false, pageSize: 50 },
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
                    borders: true,
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
      ...((isStructurePage || isPagesPage || isNavigationPage || isModulesPage)
        ? [
            nodes.widget({
              typeKey: "draft-status",
              id: SYNTHETIC_DEV_WIDGET_IDS.widgetDraftStatus,
              parentLayoutNodeId: SYNTHETIC_DEV_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 0,
              label: "builder draft status",
              config: {
                signalRoutes: {
                  emits: [
                    {
                      routeKey: "builder-draft-status-request",
                      capabilityId: "request",
                      scope: "area",
                      channel: "draftStatus",
                      action: "activate",
                      valueType: "none",
                      receiver: createPhiBuilderControllerAddress(),
                    },
                  ],
                  listens: [
                    {
                      routeKey: "builder-draft-status",
                      capabilityId: "status",
                      scope: "area",
                      channel: "draftStatus",
                      action: "change",
                      valueType: "json",
                      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
                      receiver: "broadcast",
                    },
                  ],
                },
              },
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
          : []),
    ],
  };
}

export async function buildPhiDefaultBuilderPagePresetTree({
  page,
  runtime,
  ownerModuleId,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
}) {
  return remapBuilderPresetTreeInstanceIds(
    await buildPhiDefaultBuilderPagePresetTemplateTree({
      page,
      runtime,
      presetKey,
    }),
    ownerModuleId,
    presetKey,
  );
}
