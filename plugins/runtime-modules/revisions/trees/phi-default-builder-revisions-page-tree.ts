import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight } from "../../../../helpers/shell-region-style";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  type PhiBlockRuntime,
} from "../../../../types";
import { PHI_COLOR, PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { getPhiBuilderRevisionsWidgetLabels } from "../../../../components/widgets/label-sets/revisions";
import { createPhiRevisionsControllerAddress } from "../controller/address";
import { PHI_REVISIONS_FORM_IDS } from "../forms";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS,
  PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS,
  PHI_REVISIONS_DELETE_AREA_WIDGET_IDS,
  PHI_REVISIONS_PAGE_LAYOUT_IDS,
  PHI_REVISIONS_PAGE_WIDGET_IDS,
  PHI_REVISIONS_TABLE_WIDGET_ID,
} from "../page-ids";

const PHI_REVISIONS_PAGE_REGION_IDS = {
  regionHeaderBottom: -511,
  regionContent: -513,
} as const;

/**
 * The Revisions page in the Builder: a Site's stored history as one table, and the Area shell delete
 * with the typed confirmation it asks for.
 *
 * The Page is the Revisions Module's and so is its tree. It looks like the Builder's own workspaces --
 * a header bottom over a content column -- because that is how this Page chooses to look, not because
 * it borrows their frame: nothing here comes from the Builder Module.
 */
export async function buildPhiDefaultBuilderRevisionsPageTree({
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
  const [chromeLabels, revisionsLabels] = await Promise.all([
    getPhiBuilderChromeWidgetLabels(credentials),
    getPhiBuilderRevisionsWidgetLabels(credentials),
  ]);

  return {
    page: nodes.page(),
    pageMeta: {
      title: { msgId: 0, source: "Revisions", value: chromeLabels.pageTitles.revisions },
      description: null,
    },
    overlays: [
      nodes.overlay({
        id: PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaFooter,
        sortOrder: 0,
        label: "Builder delete area",
        config: {
          title: revisionsLabels.deleteArea.title,
          width: { compact: "calc(100vw - 32px)", medium: 520, wide: 560 },
          /*
           * `remount` rather than `lazy-keep`: the field is the confirmation, and a dialog that kept a
           * half-typed Area key from the last time it was opened would carry an answer across to a
           * question nobody asked again.
           */
          mountPolicy: "remount",
          closeMode: "immediate",
          signalRoutes: {
            listens: [
              {
                routeKey: "builder-delete-area-open",
                capabilityId: "open",
                scope: "area",
                channel: "dialog",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress(
                  "cms",
                  PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea,
                ),
              },
              {
                routeKey: "builder-delete-area-close",
                capabilityId: "close",
                scope: "area",
                channel: "dialog",
                action: "close",
                valueType: "none",
                receiver: createPhiSignalAddress(
                  "cms",
                  PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea,
                ),
              },
            ],
          },
        },
      }),
    ],
    regions: [
      nodes.region({
        id: PHI_REVISIONS_PAGE_REGION_IDS.regionHeaderBottom,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: PHI_REVISIONS_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        sortOrder: 5,
        config: {
          sticky: true,
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom")}px` },
          offsetTop: resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "main"),
        },
      }),
      nodes.region({
        id: PHI_REVISIONS_PAGE_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: PHI_REVISIONS_PAGE_LAYOUT_IDS.layoutContent,
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
        id: PHI_REVISIONS_PAGE_LAYOUT_IDS.layoutHeaderBottom,
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
      // No ground of its own: the Theme's Root Background is what the table stands on.
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_REVISIONS_PAGE_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        label: "dev revisions content vertical",
        config: {
          anchor: {
            horizontal: "center",
            vertical: "top",
          },
          gap: PHI_SPACE.sm,
          margin: 0,
          padding: PHI_SPACE.base,
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaBody,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder delete area body",
        config: {
          gap: PHI_SPACE.sm,
          padding: PHI_SPACE.base,
          surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaFooter,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder delete area footer",
        config: {},
      }),
    ],
    contentWidgets: [
      /*
       * The one irreversible act in the Builder, put where stored history is looked at.
       *
       * It used to sit in the Shells toolbar beside undo and redo, which is the wrong company: a
       * command that deletes every revision of an Area, live included, should not be one button
       * away from the ones that take a step back. Its own slot, on its own, in red.
       */
      nodes.widget({
        typeKey: "command-toolbar",
        id: PHI_REVISIONS_PAGE_WIDGET_IDS.widgetRevisionsAreaShellDelete,
        parentLayoutNodeId: PHI_REVISIONS_PAGE_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "dev revisions area shell delete",
        config: {
          key: "revisions-area-shell-delete",
          compact: true,
          showLabels: true,
          buttons: [
            {
              key: "deleteArea",
              emits: [{ capabilityId: "command", value: "deleteArea" }],
              label: revisionsLabels.actions.deleteArea,
              tooltip: revisionsLabels.actions.deleteArea,
              icon: "antd:delete",
              display: "icon-label",
              danger: true,
            },
          ],
          signalRoutes: {
            emits: [
              {
                routeKey: "builder-revisions-area-shell-delete",
                capabilityId: "command",
                scope: "area",
                channel: "command",
                action: "activate",
                valueType: "string",
                receiver: createPhiRevisionsControllerAddress(),
              },
            ],
          },
        },
      }),
      /*
       * The Overlay's Body and Footer, as ordinary Widgets in ordinary slots (OVERLAYS.md).
       *
       * The warning names the Area, which no config can hold: the Revisions Controller writes it
       * in through `text/change` when the command arrives, and sends the Overlay its `open`
       * separately. Nothing here knows which Area it is about until it is asked about one.
       */
      nodes.widget({
        typeKey: "simple-text",
        id: PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaWarning,
        parentLayoutNodeId: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaBody,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder delete area warning",
        config: { text: "", tone: "danger" },
      }),
      nodes.widget({
        typeKey: "simple-text",
        id: PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaSurvives,
        parentLayoutNodeId: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaBody,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 1,
        label: "Builder delete area survives",
        config: {
          text: revisionsLabels.deleteArea.survives,
          tone: "secondary",
        },
      }),
      nodes.widget({
        typeKey: "form",
        id: PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaForm,
        parentLayoutNodeId: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaBody,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 2,
        label: "Builder delete area form",
        config: {
          formId: PHI_REVISIONS_FORM_IDS.deleteArea,
          /*
           * Signal mode, not handler mode: there is no gateway call behind this Form. What it
           * produces is one validated value, handed to the Revisions Controller, which is the
           * only place that knows which Area the value has to match.
           */
          execution: { mode: "signal", phase: "submit" },
          signalRoutes: {
            emits: [
              {
                routeKey: "builder-delete-area-values",
                capabilityId: "submitValues",
                scope: "area",
                channel: "formValues",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
                receiver: createPhiRevisionsControllerAddress(),
              },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "command-toolbar",
        id: PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaCommands,
        parentLayoutNodeId: PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS.deleteAreaFooter,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder delete area commands",
        config: {
          key: "delete-area-commands",
          compact: true,
          showLabels: true,
          buttons: [
            {
              key: "cancel",
              emits: [{ capabilityId: "close", value: null }],
              label: revisionsLabels.deleteArea.cancel,
            },
            {
              key: "confirm",
              emits: [{ capabilityId: "submit", value: null }],
              label: revisionsLabels.deleteArea.confirm,
              danger: true,
            },
          ],
          signalRoutes: {
            emits: [
              {
                routeKey: "builder-delete-area-cancel",
                capabilityId: "close",
                scope: "area",
                channel: "dialog",
                action: "close",
                valueType: "none",
                receiver: createPhiSignalAddress(
                  "cms",
                  PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea,
                ),
              },
              {
                routeKey: "builder-delete-area-submit",
                capabilityId: "submit",
                scope: "area",
                channel: "submit",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress(
                  "cms",
                  PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaForm,
                ),
              },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "table",
        id: PHI_REVISIONS_TABLE_WIDGET_ID,
        parentLayoutNodeId: PHI_REVISIONS_PAGE_LAYOUT_IDS.layoutContent,
        slotIndex: 0,
        label: "dev revisions table",
        config: {
          source: {
            providerKey: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: "history",
            params: { labels: revisionsLabels },
          },
          presentation: {
            borders: true,
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              {
                key: "revisionTags",
                fieldKey: "revisionTags",
                title: revisionsLabels.columns.revision,
                renderer: "tags",
                sticky: "left",
              },
              {
                key: "createdAt",
                fieldKey: "createdAt",
                title: revisionsLabels.columns.created,
                renderer: "datetime",
              },
              {
                key: "createdByDisplay",
                fieldKey: "createdByDisplay",
                title: revisionsLabels.columns.by,
              },
              {
                key: "formattedMessage",
                fieldKey: "formattedMessage",
                title: revisionsLabels.columns.message,
                sizing: { mode: "fill" },
              },
            ],
            controlSize: "small",
            footer: {
              template: `%1 ${revisionsLabels.revisionsLabel}`,
              values: [{ key: "revisions", value: { source: "core", fieldKey: "totalRows" } }],
              align: "start",
            },
          },
          features: {
            rowSelection: {
              mode: "multiple",
              preserveSelectedRowIdentities: false,
              disabledWhen: { source: "row", valuePath: "deleteDisabled", operator: "truthy" },
            },
            pagination: { enabled: false, pageSize: 100 },
            sorting: { mode: "none" },
            tools: {
              mode: "self-contained",
              bindingFields: [
                {
                  key: "kind",
                  label: revisionsLabels.kindLabel,
                  control: "select",
                  optionLabels: [
                    { value: "area", label: revisionsLabels.kindOptions.area },
                    { value: "page", label: revisionsLabels.kindOptions.page },
                    { value: "navigation", label: revisionsLabels.kindOptions.navigation },
                    { value: "theme", label: revisionsLabels.kindOptions.theme },
                  ],
                },
                {
                  key: "scopeKey",
                  label: revisionsLabels.scopeLabel,
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
              {
                key: "review",
                label: revisionsLabels.actions.review,
                icon: "eye",
                display: "icon",
                execution: "link",
                hrefPath: "reviewHref",
                newTab: true,
              },
              {
                key: "restore",
                label: revisionsLabels.actions.restore,
                icon: "antd:reload",
                display: "icon",
                execution: "provider",
                confirm: {
                  title: revisionsLabels.confirm.restoreTitle,
                  description: revisionsLabels.confirm.restoreDescription,
                  okText: revisionsLabels.actions.restore,
                },
              },
              {
                key: "delete",
                label: revisionsLabels.actions.delete,
                icon: "antd:delete",
                display: "icon",
                mode: "danger",
                execution: "provider",
                confirm: {
                  title: revisionsLabels.confirm.deleteTitle,
                  description: revisionsLabels.confirm.deleteDescription,
                  okText: revisionsLabels.actions.delete,
                },
              },
            ], bulk: [
              {
                key: "deleteSelected",
                label: revisionsLabels.actions.deleteSelected,
                icon: "antd:delete",
                display: "icon-label",
                mode: "danger",
                execution: "provider",
                confirm: {
                  title: revisionsLabels.confirm.deleteSelectedTitle,
                  description: revisionsLabels.confirm.deleteSelectedDescription,
                  okText: revisionsLabels.actions.deleteSelected,
                },
              },
            ] },
          },
          signalRoutes: {
            emits: [
              {
                routeKey: "builder-revisions-table-binding",
                capabilityId: "bindingParamsChange",
                scope: "area",
                channel: "bindingParams",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
                receiver: createPhiRevisionsControllerAddress(),
              },
              {
                routeKey: "builder-revisions-table-mutation",
                capabilityId: "mutationChange",
                scope: "area",
                channel: "mutation",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableMutation,
                receiver: createPhiRevisionsControllerAddress(),
              },
            ],
            listens: [
              {
                routeKey: "builder-revisions-table-binding-input",
                capabilityId: "bindingParamsChange",
                scope: "area",
                channel: "bindingParams",
                action: "change",
                valueType: "json",
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
                receiver: createPhiSignalAddress("cms", PHI_REVISIONS_TABLE_WIDGET_ID),
              },
            ],
          },
        },
      }),
    ],
  };
}
