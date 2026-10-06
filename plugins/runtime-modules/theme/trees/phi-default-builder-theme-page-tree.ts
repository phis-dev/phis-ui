import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsRegionType, PhiCmsStatus } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight } from "../../../../helpers/shell-region-style";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import type { PhiCmsPageNode, PhiCmsTreeControllerSettings, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCmsCompiledDescriptorCatalog } from "../../../../types/cms-module-descriptors";
import type { PhiCommandToolbarWidgetPlacement } from "../../../../types/core-widget-placements";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
  type PhiBlockRuntime,
} from "../../../../types";
import type { PhiSignalRoute } from "../../../../types/signals";
import { PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import {
  buildPhiSiteThemeSelectOptions,
  resolvePhiThemeSelectionValue,
} from "../../../../theme/phi-theme-selection";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { createPhiCommandToolbarId } from "../../../../components/widgets/signals/command-toolbar-address";
import {
  PHI_THEME_CONTROLLER_INSTANCE_KEY,
  PHI_THEME_CONTROLLER_TYPE,
  createPhiThemeControllerAddress,
} from "../controller/address";
import { PHI_THEME_SIGNAL_CHANNELS } from "../controller/signals";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../ids";
import { buildPhiThemeSetSelectOptions } from "../set-options";
import { PHI_THEME_PAGE_LAYOUT_IDS, PHI_THEME_PAGE_WIDGET_IDS } from "../page-ids";

const PHI_THEME_PAGE_PRESET_KEY = "builder-theme-page";

const PHI_THEME_PAGE_REGION_IDS = {
  regionHeaderBottom: -511,
  regionContent: -513,
} as const;

/** The signal key the Segmented and the Stack it switches share. */
const PHI_THEME_STACK_SIGNAL_KEY = "theme-stack";

/**
 * The Theme's command toolbar: save, preview, publish, the steps back, and reset. Every command goes to
 * the Theme Controller, which keeps the Theme's own draft and history; undo and redo listen for the
 * availability it states on their subcontrol addresses.
 */
function buildThemeCommandToolbarConfig(toolbarId: PhiCmsInstanceId): PhiCommandToolbarWidgetPlacement {
  return {
    key: "theme-command-toolbar",
    signalRoutes: {
      emits: [
        {
          routeKey: "theme-toolbar-command",
          capabilityId: "command",
          scope: "area",
          channel: "command",
          action: "activate",
          valueType: "string",
          receiver: createPhiThemeControllerAddress(),
        },
      ],
      listens: (["undo", "redo"] as const).flatMap((controlKey) => [
        {
          routeKey: `theme-toolbar-${controlKey}-enabled`,
          capabilityId: "enabled",
          scope: "area",
          channel: "enabled",
          action: "change",
          valueType: "boolean",
          receiver: createPhiSignalSubcontrolAddress("cms", toolbarId, controlKey),
        },
        {
          routeKey: `theme-toolbar-${controlKey}-tooltip`,
          capabilityId: "tooltip",
          scope: "area",
          channel: "tooltip",
          action: "change",
          valueType: "string",
          receiver: createPhiSignalSubcontrolAddress("cms", toolbarId, controlKey),
        },
      ] satisfies PhiSignalRoute[]),
    },
    compact: true,
    showLabels: false,
    buttons: [
      {
        key: "save",
        emits: [{ capabilityId: "command", value: "save" }],
        action: "save",
      },
      {
        key: "preview",
        emits: [{ capabilityId: "command", value: "preview" }],
        action: "livePreview",
      },
      {
        key: "publish",
        emits: [{ capabilityId: "command", value: "publish" }],
        action: "publish",
      },
      { key: "undo", emits: [{ capabilityId: "command", value: "undo" }], action: "undo" },
      { key: "redo", emits: [{ capabilityId: "command", value: "redo" }], action: "redo" },
      { key: "reset", emits: [{ capabilityId: "command", value: "reset" }], action: "reset" },
    ],
  };
}

/**
 * Whom the Theme Controller states its history into while this Page is shown: the toolbar's undo and
 * redo. The Area runs the Controller; the Page names the receivers, which it alone holds.
 */
function buildThemeControllerSettings(toolbarId: PhiCmsInstanceId): PhiCmsTreeControllerSettings {
  return [{
    type: PHI_THEME_CONTROLLER_TYPE,
    instanceKey: PHI_THEME_CONTROLLER_INSTANCE_KEY,
    mountScope: "page",
    config: {
      signalRoutes: {
        emits: (["undo", "redo"] as const).flatMap((controlKey) => [
          {
            routeKey: `theme-controller-${controlKey}-enabled`,
            capabilityId: `${controlKey}Enabled`,
            scope: "area",
            channel: "enabled",
            action: "change",
            valueType: "boolean",
            receiver: createPhiSignalSubcontrolAddress("cms", toolbarId, controlKey),
          },
          {
            routeKey: `theme-controller-${controlKey}-tooltip`,
            capabilityId: `${controlKey}Tooltip`,
            scope: "area",
            channel: "tooltip",
            action: "change",
            valueType: "string",
            receiver: createPhiSignalSubcontrolAddress("cms", toolbarId, controlKey),
          },
        ] satisfies PhiSignalRoute[]),
      },
    },
  }];
}

/**
 * The Theme page in the Builder: the Site's Theme Set picked in the header bottom, and four panels --
 * colour, style, background, brand -- each beside its own preview, one at a time in a Stack.
 *
 * The Page is the Theme Module's and so is its tree. It looks like the Builder's own workspaces -- a
 * header bottom over a content column, a command toolbar in the middle -- because that is how this Page
 * chooses to look, not because it borrows their frame: the toolbar here sends to the Theme Controller,
 * and nothing in this file comes from the Builder Module.
 */
export async function buildPhiDefaultBuilderThemePageTree({
  page,
  runtime,
  registry,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  registry: PhiCmsCompiledDescriptorCatalog;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  const themeToolbarId = createPhiCommandToolbarId(
    PHI_THEME_RUNTIME_MODULE_ID,
    PHI_THEME_PAGE_PRESET_KEY,
  );

  return {
    page: nodes.page(),
    pageMeta: {
      title: { msgId: 0, source: "Theme", value: labels.pageTitles.theme },
      description: null,
    },
    controllerSettings: buildThemeControllerSettings(themeToolbarId),
    overlays: [],
    regions: [
      nodes.region({
        id: PHI_THEME_PAGE_REGION_IDS.regionHeaderBottom,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        sortOrder: 5,
        config: {
          flags: PhiCmsFlags.Sticky,
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom")}px` },
          offsetTop: resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main"),
        },
      }),
      nodes.region({
        id: PHI_THEME_PAGE_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutContent,
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
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutHeaderBottom,
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
      // No ground of its own: the Theme's Root Background is what its panels stand on.
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        label: "dev brand content vertical",
        config: {
          anchor: {
            horizontal: "left",
            vertical: "top",
          },
          gap: PHI_SPACE.sm,
          margin: 0,
          padding: PHI_SPACE.base,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandControlsHeader,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutContent,
        slotIndex: 0,
        label: "dev brand controls header",
        config: {
          balancedSides: true,
          contentAlign: "center",
          gap: PHI_SPACE.sm,
          padding: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      }),
      nodes.layout({
        typeKey: "stack",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 1,
        label: "dev brand stack",
        config: {
          defaultActiveSlotKey: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].key,
          key: PHI_THEME_STACK_SIGNAL_KEY,
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
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandCardsRow,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        label: "Color",
        config: {
          gap: PHI_SPACE.sm,
          anchor: {
            horizontal: "left",
            vertical: "top",
          },
          wrap: true,
          padding: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStylePanel,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 1,
        label: "Style",
        config: {
          gap: PHI_SPACE.sm,
          anchor: {
            horizontal: "left",
            vertical: "top",
          },
          wrap: true,
          padding: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      }),
      /*
       * The label is the Segmented's third entry: it reads the Stack's slots and takes the label
       * of the first child in each, so naming this one is all the Segmented needs.
       */
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandBackgroundPanel,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 2,
        label: "Background",
        config: {
          gap: PHI_SPACE.sm,
          anchor: {
            horizontal: "left",
            vertical: "top",
          },
          wrap: true,
          padding: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandIdentityPanel,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[3].slotIndex,
        sortOrder: 3,
        label: "Brand",
        config: {
          gap: PHI_SPACE.sm,
          anchor: {
            horizontal: "left",
            vertical: "top",
          },
          wrap: true,
          padding: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "command-toolbar",
        id: themeToolbarId,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        label: "dev brand toolbar",
        config: buildThemeCommandToolbarConfig(themeToolbarId),
      }),
      nodes.widget({
        typeKey: "select-box",
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandContextSelect,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: "Brand set select",
        config: {
          value: resolvePhiThemeSelectionValue(runtime.site.key, {
            published: runtime.site.themeRevision?.publishedRevisionId != null,
            draft: runtime.site.themeRevision?.workingDraftRevisionId != null,
          }),
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
               * The Published and Draft entries name the Set each was derived from and whether
               * a draft exists at all; the Controller states the list again whenever either
               * changes. What the tree states is only what the Site record knows before that.
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
            ...buildPhiSiteThemeSelectOptions({
              siteKey: runtime.site.key,
              published: runtime.site.themeRevision?.publishedRevisionId != null
                ? {
                  theme: runtime.site.theme,
                  revisionId: runtime.site.themeRevision.publishedRevisionId,
                }
                : null,
              draft: runtime.site.themeRevision?.workingDraftRevisionId != null
                ? {
                  theme: runtime.site.theme,
                  revisionId: runtime.site.themeRevision.workingDraftRevisionId,
                }
                : null,
            }),
            ...buildPhiThemeSetSelectOptions(registry),
          ],
        },
      }),
      nodes.widget({
        typeKey: "switch",
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandPreviewModeSwitch,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandControlsHeader,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: "Brand preview mode switch",
        config: {
          defaultChecked: runtime.site.theme?.mode === "dark",
          checkedLabel: labels.themeSwitch.dark,
          uncheckedLabel: labels.themeSwitch.light,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetThemeStackSegmented,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandControlsHeader,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        label: "Theme stack segmented",
        config: {
          value: "0",
          valueMode: "stack-slot-index",
          key: PHI_THEME_STACK_SIGNAL_KEY,
          signalRoutes: {
            emits: [
              {
                routeKey: "brand-stack-meta-request",
                capabilityId: "stackMeta",
                scope: "page",
                channel: "stackMeta",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack),
              },
              {
                routeKey: "brand-stack-slot-change",
                capabilityId: "activeSlotIndex",
                scope: "page",
                channel: "activeSlotIndex",
                action: "change",
                valueType: "number",
                receiver: createPhiSignalAddress("cms", PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack),
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
            { value: "0", label: "Color" },
            { value: "1", label: "Style" },
          ],
        },
      }),
      nodes.widget({
        typeKey: "draft-status",
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetDraftStatus,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "Theme draft status",
        config: {
          signalRoutes: {
            emits: [
              {
                routeKey: "theme-draft-status-request",
                capabilityId: "request",
                scope: "area",
                channel: PHI_THEME_SIGNAL_CHANNELS.draftStatus,
                action: "activate",
                valueType: "none",
                receiver: createPhiThemeControllerAddress(),
              },
            ],
            listens: [
              {
                routeKey: "theme-draft-status",
                capabilityId: "status",
                scope: "area",
                channel: PHI_THEME_SIGNAL_CHANNELS.draftStatus,
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
                receiver: "broadcast",
              },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "builder-brand-theme-controls",
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandThemeControls,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandCardsRow,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandThemePreview,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandCardsRow,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandStyleControls,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStylePanel,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandBackgroundControls,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandBackgroundPanel,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandBackgroundPreview,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandBackgroundPanel,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandStylePreview,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStylePanel,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandIdentityControls,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandIdentityPanel,
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
        id: PHI_THEME_PAGE_WIDGET_IDS.widgetBrandIdentityPreview,
        parentLayoutNodeId: PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandIdentityPanel,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 1,
        label: "dev brand identity preview",
        config: {
          themeKey: "default",
          minSize: { width: 360 },
        },
      }),
    ],
  };
}
