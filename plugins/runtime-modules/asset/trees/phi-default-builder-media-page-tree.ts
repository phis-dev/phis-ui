import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../../constants/phi-cms";
import { PhiMediaKind } from "../../../../constants/media";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight } from "../../../../helpers/shell-region-style";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
  type PhiBlockRuntime,
} from "../../../../types";
import { PHI_COLOR, PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { getPhiMediaWidgetLabels } from "../../../../components/media/label-sets/media";
import { createPhiAssetControllerAddress } from "../../../../components/media/asset-controller-address";
import { createPhiRuntimeFormControllerAddress } from "../../../../components/forms/runtime-form-controller-address";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_ASSET_FOLDER_FORM_ID, PHI_ASSET_METADATA_FORM_ID } from "../metadata-form";
import {
  PHI_ASSET_INSPECTOR_LAYOUT_IDS,
  PHI_ASSET_INSPECTOR_OVERLAY_IDS,
  PHI_ASSET_INSPECTOR_WIDGET_IDS,
  PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS,
  PHI_ASSET_MEDIA_PAGE_WIDGET_IDS,
} from "../media-page-ids";

const PHI_ASSET_MEDIA_PAGE_REGION_IDS = {
  regionHeaderBottom: -511,
  regionContent: -513,
} as const;

/**
 * The Media library in the Builder: a gallery of the Site's assets, an inspector drawer for the one
 * picked, and the two dialogs it opens -- the focal rectangle and a new folder.
 *
 * The Page is the Asset Module's and so is its tree. It stands in the Builder Area and looks like the
 * Builder's own workspaces -- a header bottom over a content column -- because that is how this Page
 * chooses to look, not because it borrows their frame: nothing here comes from the Builder Module, and
 * the day this Page wants a different head it changes it here alone.
 */
export async function buildPhiDefaultBuilderMediaPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  const credentials = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
  const [chromeLabels, mediaLabels] = await Promise.all([
    getPhiBuilderChromeWidgetLabels(credentials),
    getPhiMediaWidgetLabels(credentials),
  ]);

  return {
    page: nodes.page(),
    pageMeta: {
      title: { msgId: 0, source: "Media", value: chromeLabels.pageTitles.media },
      description: null,
    },
    overlays: [
      nodes.overlay({
        id: PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaInspector,
        overlayType: "drawer",
        headerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorHeader,
        bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspector,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaInspectorFooter,
        sortOrder: 0,
        label: "Asset inspector",
        config: {
          title: mediaLabels?.inspector.inspectorTitle ?? "Asset inspector",
          placement: "right",
          size: 377,
          mountPolicy: "lazy-keep",
          // A clear pane: the Canvas shows through, frosted.
          surface: { background: { base: { kind: "color", color: "transparent" }, filter: "glass" } },
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
      }),
      nodes.overlay({
        id: PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFocalRect,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFocalRectFooter,
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
      }),
      nodes.overlay({
        id: PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFolderCreate,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS.layoutMediaFolderCreateFooter,
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
      }),
    ],
    regions: [
      nodes.region({
        id: PHI_ASSET_MEDIA_PAGE_REGION_IDS.regionHeaderBottom,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        sortOrder: 5,
        config: {
          sticky: true,
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom")}px` },
          offsetTop: resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main"),
        },
      }),
      nodes.region({
        id: PHI_ASSET_MEDIA_PAGE_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS.layoutContent,
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
        id: PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "dev header bottom three column",
        config: {
          balancedSides: false,
          gap: PHI_SPACE.sm,
          leftWidth: 130,
          rightWidth: 130,
          style: { height: "100%" },
        },
      }),
      // No ground of its own: the Theme's Root Background is what the gallery stands on.
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        label: "dev media content vertical",
        config: {
          anchor: {
            horizontal: "center",
            vertical: "top",
          },
          gap: PHI_SPACE.sm,
          margin: 0,
        },
      }),
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
          margin: 0,
          padding: 0,
          surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
          margin: 0,
          padding: PHI_SPACE.base,
          surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
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
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "collection-view",
        id: PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaPreview,
        parentLayoutNodeId: PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS.layoutContent,
        slotIndex: 0,
        label: "dev media preview",
        config: {
          presentation: {
            mode: "grid",
            minColumnWidth: 102,
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
              compact: true,
              pageSizes: [10, 20, 50, 100, 200],
            },
          },
          initialQuery: {
            page: 1,
            pageSize: 20,
            sortKey: "created_at",
            sortOrder: "descending",
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
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", variant: "primary" },
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
                // The field the rectangle lands in. The Widget hands over a rectangle.
                fieldKey: "focalRect",
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
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", variant: "primary" },
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
            { key: "apply", emits: [{ capabilityId: "command", value: "apply" }], actionKey: "apply", variant: "primary" },
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
    ],
  };
}
