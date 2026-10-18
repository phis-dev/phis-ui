import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsRegionType, PhiCmsStatus } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight } from "../../../../helpers/shell-region-style";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  type PhiBlockRuntime,
} from "../../../../types";
import { PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import { getPhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-sets/builder-chrome";
import { getPhiBuilderRevisionsWidgetLabels } from "../../../../components/widgets/label-sets/revisions";
import {
  createPhiRevisionsControllerAddress,
  PHI_REVISIONS_CONTROLLER_INSTANCE_KEY,
  PHI_REVISIONS_CONTROLLER_TYPE,
} from "../controller/address";
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
import { PHI_DIALOG_BODY_CONFIG, PHI_DIALOG_COMMANDS_CONFIG } from "../../../../helpers/cms-dialog";
import { PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM } from "../../../../helpers/cms-scope-search-params";

/** Where the history's kind stands in the address, for a `page` condition. */
const KIND_QUERY_PATH = `query.${PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM}`;

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
  const deleteAreaOverlay = createPhiSignalAddress("cms", PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea);

  return {
    page: nodes.page(),
    pageMeta: {
      title: { msgId: 0, source: "Revisions", value: chromeLabels.pageTitles.revisions },
      description: null,
    },
    /*
     * Whom the Revisions Controller answers into on this Page: the history Table it hands the scope,
     * and the delete-Area dialog with the warning in its Body. The Area runs the Controller for every
     * Builder Page; while this one is shown it is told (`collectPhiRuntimeControllerConfigOverlays`).
     */
    controllerSettings: [{
      type: PHI_REVISIONS_CONTROLLER_TYPE,
      instanceKey: PHI_REVISIONS_CONTROLLER_INSTANCE_KEY,
      mountScope: "page",
      config: {
        signalRoutes: {
          emits: [
            {
              routeKey: "builder-revisions-controller-binding",
              capabilityId: "bindingParamsChange",
              scope: "area",
              channel: "bindingParams",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
              receiver: createPhiSignalAddress("cms", PHI_REVISIONS_TABLE_WIDGET_ID),
            },
            {
              routeKey: "builder-revisions-controller-delete-area-warning",
              capabilityId: "deleteAreaWarning",
              scope: "area",
              channel: "text",
              action: "change",
              valueType: "string",
              receiver: createPhiSignalAddress("cms", PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaWarning),
            },
            { routeKey: "builder-revisions-controller-delete-area-open", capabilityId: "deleteAreaOpen", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: deleteAreaOverlay },
            { routeKey: "builder-revisions-controller-delete-area-close", capabilityId: "deleteAreaClose", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: deleteAreaOverlay },
            { routeKey: "builder-revisions-controller-history-reload", capabilityId: "historyReload", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_REVISIONS_TABLE_WIDGET_ID) },
          ],
        },
      },
    }],
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
          flags: PhiCmsFlags.Sticky,
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
          ...PHI_DIALOG_BODY_CONFIG,
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
          controlSize: "small",
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
        /*
         * Never empty: a text Widget with no text of its own counts as content nobody published and is
         * left out of the live render (`isPhiCmsWidgetContentUnpublished`), and then there is nothing
         * for the Controller's sentence naming the Area to arrive at.
         */
        config: { text: revisionsLabels.deleteArea.warning, tone: "danger" },
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
            /*
             * The footer's confirm button sends `submit` here. A route on the sender alone delivers
             * nothing: the Form has to say it takes the signal, or the button presses into silence.
             * In `page` scope, because that is where a Widget of this Page registers, and the bus
             * hands a signal over in its receiver's scope -- a listen route in `area` filtered it out.
             */
            listens: [
              {
                routeKey: "builder-delete-area-submit-form",
                capabilityId: "submit",
                scope: "page",
                channel: "submit",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_REVISIONS_DELETE_AREA_WIDGET_IDS.deleteAreaForm),
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
          ...PHI_DIALOG_COMMANDS_CONFIG,
          buttons: [
            {
              key: "cancel",
              emits: [{ capabilityId: "close", value: null }],
              label: revisionsLabels.deleteArea.cancel,
              icon: "cancel",
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
                scope: "page",
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
            params: { labels: revisionsLabels, locale: runtime.locale.current },
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
            actions: {
              /*
               * Back to the Module's preset, for a Module's Page: the Site's override goes with every
               * revision listed here, so the act sits beside them (phis-server CONTENT.md, Reset). Away
               * from a Page it is greyed out with the reason beside it; a Page of the Site's own has no
               * preset either, and that one the Provider refuses with the same sentence.
               */
              toolbar: [
                {
                  key: "resetPage",
                  label: revisionsLabels.actions.resetPage,
                  /*
                   * Greyed out unless a Page's history is shown. The kind is read from the address,
                   * which the Controller keeps in step with the Table's own selector; asking the
                   * Controller instead would mount it at Page scope, which it refuses
                   * (design/STATE_MACHINES.md). Every kind but `page` is listed, because a condition
                   * has no "not equals"; an absent kind is the Area.
                   */
                  disabledWhen: {
                    match: "any",
                    conditions: [null, "area", "navigation", "theme"].map((kind) => ({
                      source: "page" as const,
                      valuePath: KIND_QUERY_PATH,
                      ...(kind ? { operator: "equals" as const, value: kind } : { operator: "falsy" as const }),
                      reason: revisionsLabels.actions.resetPageUnavailable,
                    })),
                  },
                  icon: "antd:undo",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  confirm: {
                    title: revisionsLabels.confirm.resetPageTitle,
                    description: revisionsLabels.confirm.resetPageDescription,
                    okText: revisionsLabels.actions.resetPage,
                  },
                },
              ],
              row: [
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
                display: "icon",
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
                routeKey: "builder-revisions-table-reload",
                capabilityId: "reload",
                scope: "page",
                channel: "reload",
                action: "activate",
                valueType: "none",
                receiver: createPhiSignalAddress("cms", PHI_REVISIONS_TABLE_WIDGET_ID),
              },
              {
                routeKey: "builder-revisions-table-binding-input",
                capabilityId: "bindingParamsChange",
                scope: "page",
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
