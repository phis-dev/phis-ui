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
} from "../../../../types/signals";
import type { PhiFormId } from "../../../../types/form-id";
import { PHI_NEWS_FORM_IDS } from "../forms";
import {
  PHI_EDITOR_NEWS_CREATE_COMMANDS_WIDGET_ID,
  PHI_EDITOR_NEWS_CREATE_FORM_WIDGET_ID,
  PHI_EDITOR_NEWS_CREATE_OVERLAY_FOOTER_LAYOUT_ID,
  PHI_EDITOR_NEWS_CREATE_OVERLAY_ID,
  PHI_EDITOR_NEWS_CREATE_OVERLAY_LAYOUT_ID,
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
  key: "create" | "entry" | "publication";
  title: string;
  formId: PhiFormId;
  /*
   * The row action this dialog is for.
   *
   * A Table announces one thing -- an action happened on a row, and here is which one -- so each receiver
   * decides for itself whether it was meant: the Overlay by this key on its own config, and a
   * record-bound Form by the same key on its own. Without it an Overlay opens for every announcement,
   * deleting included.
   */
  openActionKey: string;
  /*
   * Whether the Form reads the row it was opened with.
   *
   * A record-bound Form waits: it shows its skeleton from the moment it mounts and leaves it when the row
   * arrives. That is right for correcting an entry and impossible for writing a new one, which has no
   * row -- so the create dialog carries the same Form with no source, and it opens ready to type.
   */
  bindsRecord: boolean;
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

const TABLE_ADDRESS = createPhiSignalAddress("cms", PHI_EDITOR_NEWS_WIDGET_ID);

/**
 * A dialog, stated once and built three times.
 *
 * Nothing here coordinates anything: the Overlay opens itself on the action it names, the Form reads the
 * row from the same announcement, the footer presses that Form, and a Form that went through closes its
 * Overlay and tells the Table to read again. Every route names a Widget, and the whole exchange is in the
 * Page rather than in code -- which is what lets a Site rearrange it.
 *
 * It had a Module Controller in between, for two things only: the Save button's spinner, and refusing to
 * close while a save was in flight. Those two cost a Controller to mount, an address to match per dialog,
 * and a listener that had to be told not to hear itself -- three silent failures in one afternoon, each of
 * which left every visible part of the page looking right.
 */
function buildPhiNewsDialogNodes(
  nodes: ReturnType<typeof createPhiCmsPresetNodes>,
  input: NewsDialogInput,
) {
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
      sortOrder: input.key === "create" ? 0 : input.key === "entry" ? 10 : 20,
      label: `editor news ${input.key} modal`,
      config: {
        title: input.title,
        width: { compact: "calc(100vw - 32px)", medium: 720, wide: 880 },
        mountPolicy: "remount",
        /*
         * `immediate`: there is nobody to ask. `request` exists so a Controller can refuse while a save
         * is in flight, and the price of not having one is that the X closes a dialog mid-save -- the
         * save still lands, because the Form's submit is already on its way to Core.
         */
        closeMode: "immediate",
        openActionKey: input.openActionKey,
        signalRoutes: {
          listens: [
            { routeKey: `${prefix}-overlay-open`, capabilityId: "open", scope: "page", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction, receiver: overlayAddress },
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
          borders: false,
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
           * second time, and `openActionKey` decides which action it reads for. A Form with no source has
           * nothing to wait for and opens blank; its hidden `contentId` stays empty, which is what tells
           * Core that this is a new entry rather than a correction.
           */
          source: input.bindsRecord ? NEWS_DIALOG_SOURCE : null,
          ...(input.bindsRecord ? { openActionKey: input.openActionKey } : {}),
          // What Core said, said to the reader: the dialog is gone by then and would say nothing itself.
          feedback: { mode: "message" },
          signalRoutes: {
            emits: [
              /*
               * One success, two consequences: this dialog is finished, and the list it came from is
               * stale. Both take no value -- a `formResult` would match neither listener, which is how a
               * Table once never reloaded although the save had gone through.
               */
              { routeKey: `${prefix}-form-success-close`, capabilityId: "submitSuccess", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
              { routeKey: `${prefix}-form-success-reload`, capabilityId: "submitSuccess", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: TABLE_ADDRESS },
            ],
            listens: [
              ...(input.bindsRecord
                ? [{ routeKey: `${prefix}-form-open`, capabilityId: "recordOpen", scope: "page" as const, channel: "action", action: "activate" as const, valueType: "json" as const, valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction, receiver: formAddress }]
                : []),
              { routeKey: `${prefix}-form-submit`, capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: formAddress },
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
          /*
           * The two buttons as one group, the way every other overlay footer states it: they are the two
           * ends of a single decision, and a gap between them reads as two unrelated offers. Wrapping
           * follows from that and is not stated -- a compact group does not wrap.
           */
          compact: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "close", value: null }], actionKey: "cancel", label: input.cancelLabel },
            { key: "save", emits: [{ capabilityId: "submit", value: null }], actionKey: "save", label: input.saveLabel, variant: "primary" },
          ],
          signalRoutes: {
            emits: [
              { routeKey: `${prefix}-cancel`, capabilityId: "close", scope: "page", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
              { routeKey: `${prefix}-save`, capabilityId: "submit", scope: "page", channel: "submit", action: "activate", valueType: "none", receiver: formAddress },
            ],
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
  /*
   * The same Form twice: once with nothing to read, once bound to the row that was pressed.
   *
   * Two dialogs rather than one, because a record-bound Form cannot be asked to start blank -- it waits
   * for a row, and a new entry has none. One dialog for both was the first attempt: it opened on the plus
   * and stayed a skeleton, because nothing was ever going to arrive.
   */
  const createDialog = buildPhiNewsDialogNodes(nodes, {
    key: "create",
    title: widgetLabels.overlays.create,
    formId: PHI_NEWS_FORM_IDS.entry,
    openActionKey: "new",
    bindsRecord: false,
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: PHI_EDITOR_NEWS_CREATE_OVERLAY_ID,
      body: PHI_EDITOR_NEWS_CREATE_OVERLAY_LAYOUT_ID,
      footer: PHI_EDITOR_NEWS_CREATE_OVERLAY_FOOTER_LAYOUT_ID,
      form: PHI_EDITOR_NEWS_CREATE_FORM_WIDGET_ID,
      commands: PHI_EDITOR_NEWS_CREATE_COMMANDS_WIDGET_ID,
    },
  });
  const entryDialog = buildPhiNewsDialogNodes(nodes, {
    key: "entry",
    title: widgetLabels.overlays.entry,
    formId: PHI_NEWS_FORM_IDS.entry,
    openActionKey: "edit",
    bindsRecord: true,
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
    bindsRecord: true,
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
    overlays: [createDialog.overlay, entryDialog.overlay, publicationDialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      ...createDialog.layouts,
      ...entryDialog.layouts,
      ...publicationDialog.layouts,
    ],
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
               * A new entry is a toolbar action: there is no row to press. It is announced like any other
               * action, and the create dialog opens itself because its `openActionKey` says `new`.
               */
              toolbar: [
                {
                  key: "new",
                  label: widgetLabels.actions.new,
                  icon: "antd:plus",
                  // A plus, like every other Table's add: the label stays as its tooltip and its aria name.
                  display: "icon",
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
            /*
             * One announcement, five listeners.
             *
             * The Table says which action happened on which row and nothing more; each receiver decides
             * whether it was meant, by the `openActionKey` on its own config. That is why there is no
             * coordinator here: a dialog that does not recognise the action ignores it, and a Site that
             * adds a sixth receiver adds a route rather than a case in somebody's code.
             */
            emits: [
              ...[
                PHI_EDITOR_NEWS_CREATE_OVERLAY_ID,
                PHI_EDITOR_NEWS_ENTRY_OVERLAY_ID,
                PHI_EDITOR_NEWS_ENTRY_FORM_WIDGET_ID,
                PHI_EDITOR_NEWS_PUBLICATION_OVERLAY_ID,
                PHI_EDITOR_NEWS_PUBLICATION_FORM_WIDGET_ID,
              ].map((receiverId, index) => ({
                routeKey: `editor-news-table-action-${index}`,
                capabilityId: "actionActivate",
                scope: "page" as const,
                channel: "action",
                action: "activate" as const,
                valueType: "json" as const,
                valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
                receiver: createPhiSignalAddress("cms", receiverId),
              })),
            ],
            listens: [{
              // What a saved Form leads to: the list read again, decided by the Table and not by the Form.
              routeKey: "editor-news-table-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: TABLE_ADDRESS,
            }],
          },
        },
      }),
      ...createDialog.widgets,
      ...entryDialog.widgets,
      ...publicationDialog.widgets,
    ],
  };
}
