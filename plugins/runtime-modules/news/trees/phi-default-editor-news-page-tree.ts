import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { getPhiEditorNewsWidgetLabels } from "./editor-news-widget-label-set";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
import { PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
} from "../../../../types/signals";
import { createPhiNewsControllerAddress } from "../controller/address";
import { PHI_NEWS_FORM_IDS } from "../forms";
import {
  PHI_EDITOR_NEWS_ENTRY_COMMANDS_WIDGET_ID,
  PHI_EDITOR_NEWS_ENTRY_FORM_WIDGET_ID,
  PHI_EDITOR_NEWS_ENTRY_OVERLAY_FOOTER_LAYOUT_ID,
  PHI_EDITOR_NEWS_ENTRY_OVERLAY_ID,
  PHI_EDITOR_NEWS_ENTRY_OVERLAY_LAYOUT_ID,
  PHI_EDITOR_NEWS_PUBLICATION_COMMANDS_WIDGET_ID,
  PHI_EDITOR_NEWS_PUBLICATION_FORM_WIDGET_ID,
  PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_FOOTER_LAYOUT_ID,
  PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_ID,
  PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_LAYOUT_ID,
  PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_NEWS_TABLE_RESOURCE_KEY,
} from "../ids";
import { getPhiEditorNewsPageLabels } from "./editor-news-label-set";
import { PHI_EDITOR_NEWS_WIDGET_ID } from "../ids";

const SYNTHETIC_EDITOR_NEWS_REGION_IDS = { regionContent: -562 } as const;

/** One dialog's five nodes, and the words on its two buttons. */
type NewsDialogInput = {
  key: "entry" | "publication";
  title: string;
  formId: string;
  openActionKey: string;
  saveLabel: string;
  cancelLabel: string;
  ids: {
    overlay: PhiCmsInstanceId;
    body: PhiCmsInstanceId;
    footer: PhiCmsInstanceId;
    form: PhiCmsInstanceId;
    commands: PhiCmsInstanceId;
  };
};

const NEWS_DIALOG_SOURCE = {
  providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
  resourceKey: PHI_NEWS_TABLE_RESOURCE_KEY,
} as const;

/**
 * A dialog, stated once and built twice.
 *
 * The two differ in three things -- which Form they carry, which row action opens them, and what their
 * title says -- and in nothing else. Writing them out twice would be two chances for the wiring to drift,
 * and the wiring is the part that cannot be seen from the outside: every route below names the Controller
 * as its receiver, and the Controller tells the two apart by the address a signal came from.
 */
function buildPhiNewsDialogNodes(
  nodes: ReturnType<typeof createPhiCmsPresetNodes>,
  input: NewsDialogInput,
) {
  const controller = createPhiNewsControllerAddress();
  const overlayAddress = createPhiSignalAddress("cms", input.ids.overlay);
  const formAddress = createPhiSignalAddress("cms", input.ids.form);
  const prefix = `editor-news-${input.key}`;

  return {
    overlay: nodes.overlay({
      id: input.ids.overlay,
      overlayType: "modal",
      bodyLayoutNodeId: input.ids.body,
      footerPresentation: "actions",
      footerLayoutNodeId: input.ids.footer,
      sortOrder: input.key === "entry" ? 0 : 10,
      label: `editor news ${input.key} modal`,
      config: {
        title: input.title,
        width: { compact: "calc(100vw - 32px)", medium: 720, wide: 880 },
        mountPolicy: "remount",
        closeMode: "request",
        signalRoutes: {
          emits: [
            { routeKey: `${prefix}-overlay-state`, capabilityId: "openChange", scope: "page", channel: "state", action: "change", valueType: "boolean", receiver: controller },
            { routeKey: `${prefix}-overlay-close-request`, capabilityId: "closeRequest", scope: "page", channel: "dialog", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest, receiver: controller },
          ],
          listens: [
            { routeKey: `${prefix}-overlay-open`, capabilityId: "open", scope: "page", channel: "dialog", action: "activate", valueType: "none", receiver: overlayAddress },
            { routeKey: `${prefix}-overlay-close`, capabilityId: "close", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
          ],
        },
      },
    }),
    layouts: [
      nodes.layout({
        id: input.ids.body,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `editor news ${input.key} modal content`,
        // The Body's root Layout is its one padding owner (OVERLAYS.md): the Modal adds none.
        config: {
          anchor: { horizontal: "left", vertical: "top" },
          gap: PHI_SPACE.base,
          margin: 0,
          padding: PHI_SPACE.base,
          border: false,
        },
      }),
      nodes.layout({
        id: input.ids.footer,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `editor news ${input.key} modal footer`,
        config: {},
      }),
    ],
    widgets: [
      nodes.widget({
        id: input.ids.form,
        parentLayoutNodeId: input.ids.body,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 10,
        label: `editor news ${input.key} form`,
        config: {
          formId: input.formId,
          /*
           * The Table's own resource, so the Form reads the row that was pressed rather than asking Core a
           * second time -- and `openActionKey` is what keeps it empty until a row arrives, which is how a
           * new entry gets a blank Form without a second one existing.
           */
          source: NEWS_DIALOG_SOURCE,
          openActionKey: input.openActionKey,
          signalRoutes: {
            emits: [
              { routeKey: `${prefix}-form-submit-success`, capabilityId: "submitSuccess", scope: "page", channel: "submit", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult, receiver: controller },
              { routeKey: `${prefix}-form-submitting`, capabilityId: "submitting", scope: "page", channel: "submitting", action: "change", valueType: "boolean", receiver: controller },
            ],
            listens: [
              { routeKey: `${prefix}-form-open`, capabilityId: "recordOpen", scope: "page", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction, receiver: formAddress },
              { routeKey: `${prefix}-form-submit`, capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: formAddress },
              { routeKey: `${prefix}-form-reset`, capabilityId: "reset", scope: "page", channel: "reset", action: "activate", valueType: "none", receiver: formAddress },
            ],
          },
        },
      }),
      nodes.widget({
        id: input.ids.commands,
        parentLayoutNodeId: input.ids.footer,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `editor news ${input.key} commands`,
        config: {
          key: `${prefix}-commands`,
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: input.cancelLabel },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", label: input.saveLabel, variant: "primary" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: `${prefix}-command`,
              capabilityId: "command",
              scope: "page",
              channel: "command",
              action: "activate",
              valueType: "string",
              receiver: controller,
            }],
            listens: [{
              routeKey: `${prefix}-save-loading`,
              capabilityId: "loading",
              scope: "page",
              channel: "submitting",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalSubcontrolAddress("cms", input.ids.commands, "save"),
            }],
          },
        },
      }),
    ],
  };
}

/**
 * The News page of the Editor Area: the Site's entries in a Table.
 *
 * The Table is the core Widget bound to the News Module's Provider, which is what makes the same rows
 * placeable on any Page a Site composes -- the Page here is one placement, not the surface itself. Who may
 * see them is decided by the endpoint behind the Provider, so a Table on a Page nobody may edit answers
 * nothing rather than being kept out.
 *
 * Withdrawing and deleting are row actions: they state nothing, so they need no Form. Writing an entry and
 * publishing one do state something and are Forms, which arrive with the overlay this page will grow.
 */
export async function buildPhiDefaultEditorNewsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const credentials = readPhiServerApiCredentials();
  const translatorOptions = {
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  };
  const labels = await getPhiEditorNewsPageLabels(translatorOptions);
  const widgetLabels = await getPhiEditorNewsWidgetLabels(translatorOptions);

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_EDITOR_NEWS_REGION_IDS.regionContent,
  });

  const nodes = createPhiCmsPresetNodes(page);
  const entryDialog = buildPhiNewsDialogNodes(nodes, {
    key: "entry",
    title: widgetLabels.overlays.entry,
    formId: PHI_NEWS_FORM_IDS.entry,
    openActionKey: "edit",
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: PHI_EDITOR_NEWS_ENTRY_OVERLAY_ID,
      body: PHI_EDITOR_NEWS_ENTRY_OVERLAY_LAYOUT_ID,
      footer: PHI_EDITOR_NEWS_ENTRY_OVERLAY_FOOTER_LAYOUT_ID,
      form: PHI_EDITOR_NEWS_ENTRY_FORM_WIDGET_ID,
      commands: PHI_EDITOR_NEWS_ENTRY_COMMANDS_WIDGET_ID,
    },
  });
  const publicationDialog = buildPhiNewsDialogNodes(nodes, {
    key: "publication",
    title: widgetLabels.overlays.publication,
    formId: PHI_NEWS_FORM_IDS.publication,
    openActionKey: "publish",
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_ID,
      body: PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_LAYOUT_ID,
      footer: PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_FOOTER_LAYOUT_ID,
      form: PHI_EDITOR_NEWS_PUBLICATION_FORM_WIDGET_ID,
      commands: PHI_EDITOR_NEWS_PUBLICATION_COMMANDS_WIDGET_ID,
    },
  });

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [entryDialog.overlay, publicationDialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode, ...entryDialog.layouts, ...publicationDialog.layouts],
    contentWidgets: [
      nodes.widget({
        id: PHI_EDITOR_NEWS_WIDGET_ID,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        label: labels.widgetLabel,
        config: {
          source: {
            providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table,
            resourceKey: PHI_NEWS_TABLE_RESOURCE_KEY,
          },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              {
                key: "title",
                fieldKey: "title",
                title: widgetLabels.columns.title,
                sizing: { mode: "fill", minWidth: 280 },
              },
              {
                key: "slug",
                fieldKey: "slug",
                title: widgetLabels.columns.slug,
                renderer: "code",
                sizing: { mode: "content", minWidth: 160 },
              },
              {
                key: "status",
                fieldKey: "status",
                title: widgetLabels.columns.status,
                renderer: "badge",
                // The Provider answers a word; these are the words a reader sees.
                valueMap: { draft: widgetLabels.rowStatus.draft, published: widgetLabels.rowStatus.published },
                sizing: { mode: "content", minWidth: 112 },
              },
              {
                key: "sourceLocale",
                fieldKey: "sourceLocale",
                title: widgetLabels.columns.language,
                sizing: { mode: "content", minWidth: 96 },
              },
              {
                key: "tags",
                fieldKey: "tags",
                title: widgetLabels.columns.tags,
                renderer: "tags",
                sizing: { mode: "content", minWidth: 160 },
              },
              {
                key: "publishedAt",
                fieldKey: "publishedAt",
                title: widgetLabels.columns.published,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
              {
                key: "expiresAt",
                fieldKey: "expiresAt",
                title: widgetLabels.columns.expires,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
              {
                key: "updatedAt",
                fieldKey: "updatedAt",
                title: widgetLabels.columns.changed,
                renderer: "datetime",
                sizing: { mode: "content", minWidth: 168 },
              },
            ],
            emptyState: { title: widgetLabels.empty.title, description: widgetLabels.empty.text },
            controlSize: "small",
          },
          features: {
            search: { enabled: true, placeholder: widgetLabels.searchPlaceholder },
            filters: [
              {
                key: "status",
                type: "select",
                label: widgetLabels.statusLabel,
                options: [
                  { value: "all", label: widgetLabels.statuses.all },
                  { value: "draft", label: widgetLabels.statuses.draft },
                  { value: "published", label: widgetLabels.statuses.published },
                ],
                defaultValue: "all",
              },
            ],
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reset: true, reload: true },
            actions: {
              /*
               * A new entry is a toolbar action: there is no row to press, and the Controller answers it by
               * resetting the entry Form and opening its dialog on nothing.
               */
              toolbar: [
                {
                  key: "new",
                  label: widgetLabels.actions.new,
                  icon: "antd:plus",
                  display: "label",
                  mode: "primary",
                  execution: "signal",
                },
              ],
              row: [
                /*
                 * `signal` rather than `provider`: both of these open a dialog, and only this Module knows
                 * which. Withdrawing and deleting below state nothing and go straight to the Provider.
                 */
                {
                  key: "edit",
                  label: widgetLabels.actions.edit,
                  icon: "edit",
                  display: "icon",
                  execution: "signal",
                },
                {
                  key: "publish",
                  label: widgetLabels.actions.publish,
                  icon: "antd:send",
                  display: "icon",
                  execution: "signal",
                },
                {
                  key: "withdraw",
                  label: widgetLabels.actions.withdraw,
                  icon: "antd:eye-invisible",
                  display: "icon",
                  execution: "provider",
                  // Nothing to withdraw from an entry that was never published.
                  disabledWhen: { source: "row", valuePath: "publishedAt", operator: "falsy" },
                  confirm: {
                    title: widgetLabels.withdraw.title,
                    description: widgetLabels.withdraw.description,
                    okText: widgetLabels.actions.withdraw,
                  },
                },
                {
                  key: "delete",
                  label: widgetLabels.actions.delete,
                  icon: "antd:delete",
                  display: "icon",
                  mode: "danger",
                  execution: "provider",
                  /*
                   * Offered for a published entry as well, on purpose: Core answers `409` with the reason,
                   * and that sentence is better than a button greyed out by a row that may be a minute old.
                   */
                  confirm: {
                    title: widgetLabels.delete.title,
                    description: widgetLabels.delete.description,
                    okText: widgetLabels.actions.delete,
                  },
                },
              ],
            },
          },
          initialQuery: { filters: { status: "all" } },
          signalRoutes: {
            emits: [{
              routeKey: "editor-news-table-action",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiNewsControllerAddress(),
            }],
            listens: [{
              // What a saved Form leads to: the list read again, decided by the Table and not by the Form.
              routeKey: "editor-news-table-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", PHI_EDITOR_NEWS_WIDGET_ID),
            }],
          },
        },
      }),
      ...entryDialog.widgets,
      ...publicationDialog.widgets,
    ],
  };
}
