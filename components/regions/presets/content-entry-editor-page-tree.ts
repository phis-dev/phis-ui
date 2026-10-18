import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import type { PhiContentEntryKind } from "../../../constants/content-entry-kinds";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../constants/core-data-provider-keys";
import { canPhiViewerAccess, PHI_VIEWER_ACCESS_PUBLISHING } from "../../../types/access";
import type { PhiTableActionDefinition } from "../../../types/table-widget";
import { PhiCmsPageType } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { createPhiPresetCmsInstanceIdMap, type PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime, PhiRuntimeModuleId } from "../../../types";
import { getPhiContentEntryEditorLabels } from "../../widgets/label-sets/content-entries";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "./phi-base-page-layout";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  type PhiSignalAddress,
} from "../../../types/signals";
import type { PhiFormId } from "../../../types/form-id";
import type { PhiProviderResourceSource } from "../../../types/runtime-data-provider";
import { PHI_CONTENT_ENTRY_SOURCE_LOCALE_PLACEHOLDER_CONFIG_KEY } from "../../forms/content-entry-forms";
import { PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS } from "../../forms/content-entry-curation-config";
import { PHI_SITE_LOCALES_CONFIG_KEY } from "../../forms/site-locales-config";
import { PHI_DIALOG_BODY_CONFIG, PHI_DIALOG_COMMANDS_CONFIG } from "../../../helpers/cms-dialog";

/**
 * The words of an editor Page that differ by kind; everything else is the shared Label Set's.
 *
 * Handed in by the kind's Module from its own Label Set, already translated: "New news entry" and "New
 * blog post" are not one sentence with a noun swapped, and a translator sees them as the two they are.
 */
export type PhiContentEntryKindEditorLabels = {
  /** The Table's name in the Builder's layer tree: "news entries". */
  widgetLabel: string;
  /** The edit dialog's title: "News entry". */
  entryTitle: string;
  /** The create dialog's title: "New news entry". */
  createTitle: string;
  /** What the empty Table says: "No news entries yet." */
  emptyTitle: string;
};

/**
 * The node keys of an editor Page. They make its instance ids together with the Module and the preset
 * key, so they are part of every stored placement and do not change.
 */
const EDITOR_NODE_KEYS = [
  "widgetNews",
  "overlayCreate",
  "layoutCreate",
  "layoutCreateFooter",
  "widgetCreateForm",
  "widgetCreateCommands",
  "overlayEntry",
  "layoutEntry",
  "layoutEntryFooter",
  "widgetEntryForm",
  "widgetEntryCommands",
  "overlayPublication",
  "layoutPublication",
  "layoutPublicationFooter",
  "widgetPublicationForm",
  "widgetPublicationCommands",
  "overlayCuration",
  "layoutCuration",
  "layoutCurationFooter",
  "widgetCurationForm",
  "widgetCurationCommands",
  "widgetCategories",
  "overlayCategoryCreate",
  "layoutCategoryCreate",
  "layoutCategoryCreateFooter",
  "widgetCategoryCreateForm",
  "widgetCategoryCreateCommands",
  "overlayCategoryEdit",
  "layoutCategoryEdit",
  "layoutCategoryEditFooter",
  "widgetCategoryEditForm",
  "widgetCategoryEditCommands",
] as const;

const SYNTHETIC_EDITOR_REGION_IDS = { regionContent: -562 } as const;

/** One dialog's five nodes, and the words on its two buttons. */
type EntryDialogKey = "create" | "entry" | "publication" | "curation" | "category-create" | "category-edit";

/** Where each dialog stands among the Page's Overlays, in the order they are reached. */
const DIALOG_SORT_ORDER: Record<EntryDialogKey, number> = {
  create: 0,
  entry: 10,
  publication: 20,
  curation: 30,
  "category-create": 40,
  "category-edit": 50,
};

type EntryDialogInput = {
  key: EntryDialogKey;
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
  /** What the Form's fields read from their placement: the Site's languages, for one. */
  formConfig?: Record<string, unknown>;
  saveLabel: string;
  cancelLabel: string;
  ids: {
    overlay: PhiCmsInstanceId;
    body: PhiCmsInstanceId;
    footer: PhiCmsInstanceId;
    form: PhiCmsInstanceId;
    commands: PhiCmsInstanceId;
  };
  /** The rows of the Table the dialog is opened from, which a record-bound Form reads the pressed one from. */
  source: PhiProviderResourceSource;
  tableAddress: PhiSignalAddress;
  /** The prefix of every route key on the Page: `editor-<kind>`. */
  routePrefix: string;
};

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
function buildEntryDialogNodes(
  nodes: ReturnType<typeof createPhiCmsPresetNodes>,
  input: EntryDialogInput,
) {
  const overlayAddress = createPhiSignalAddress("cms", input.ids.overlay);
  const formAddress = createPhiSignalAddress("cms", input.ids.form);
  const prefix = `${input.routePrefix}-${input.key}`;

  return {
    overlay: nodes.overlay({
      id: input.ids.overlay,
      overlayType: "modal",
      bodyLayoutNodeId: input.ids.body,
      footerPresentation: "actions",
      footerLayoutNodeId: input.ids.footer,
      sortOrder: DIALOG_SORT_ORDER[input.key],
      label: `${input.routePrefix} ${input.key} modal`,
      config: {
        title: input.title,
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
        label: `${input.routePrefix} ${input.key} modal content`,
        // The Body's root Layout is its one padding owner (OVERLAYS.md): the Modal adds none.
        config: {
          ...PHI_DIALOG_BODY_CONFIG,
          anchor: { horizontal: "center", vertical: "top" },
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
        label: `${input.routePrefix} ${input.key} modal footer`,
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
        label: `${input.routePrefix} ${input.key} form`,
        config: {
          formId: input.formId,
          /*
           * The Table's own resource, so the Form reads the row that was pressed rather than asking Core a
           * second time, and `openActionKey` decides which action it reads for. A Form with no source has
           * nothing to wait for and opens blank; its hidden `contentId` stays empty, which is what tells
           * Core that this is a new entry rather than a correction.
           */
          source: input.bindsRecord ? input.source : null,
          ...(input.formConfig ? { formConfig: input.formConfig } : {}),
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
              { routeKey: `${prefix}-form-success-reload`, capabilityId: "submitSuccess", scope: "page", channel: "reload", action: "activate", valueType: "none", receiver: input.tableAddress },
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
        label: `${input.routePrefix} ${input.key} commands`,
        config: {
          key: `${prefix}-commands`,
          ...PHI_DIALOG_COMMANDS_CONFIG,
          /*
           * The two buttons as one group, the way every other overlay footer states it: they are the two
           * ends of a single decision, and a gap between them reads as two unrelated offers. Wrapping
           * follows from that and is not stated -- a compact group does not wrap.
           */
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "close", value: null }], label: input.cancelLabel, icon: "cancel" },
            { key: "save", emits: [{ capabilityId: "submit", value: null }], label: input.saveLabel, variant: "primary", icon: "save" },
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
 * The editor Page of one content kind: the Site's entries in a Table, and the three dialogs one writes in
 * (`CONTENT_ENTRIES.md`).
 *
 * The Table is the core Widget bound to Core's entries Provider under the kind's resource, which is what
 * makes the same rows placeable on any Page a Site composes -- the Page here is one placement, not the
 * surface itself. Who may see them is decided by the endpoint behind the Provider, so a Table on a Page
 * nobody may edit answers nothing rather than being kept out.
 *
 * Withdrawing, submitting and deleting are row actions: they state nothing, so they need no Form. Writing
 * an entry and publishing one do state something and are Forms, in the dialogs below.
 */
export async function buildPhiContentEntryEditorPageTree({
  page,
  runtime,
  kind,
  ownerModuleId,
  presetKey,
  formIds,
  kindLabels,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  kind: PhiContentEntryKind;
  /** The kind's Module, whose preset this Page is: with `presetKey`, the identity of every node on it. */
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  /** The Module's Forms (`definePhiContentEntryForms`). */
  formIds: { entry: PhiFormId; publication: PhiFormId; curation: PhiFormId; category: PhiFormId };
  kindLabels: PhiContentEntryKindEditorLabels;
}): Promise<PhiResolvedCmsPageTree> {
  const credentials = readPhiServerApiCredentials();
  const widgetLabels = await getPhiContentEntryEditorLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });
  const ids = createPhiPresetCmsInstanceIdMap({ domain: "page", ownerModuleId, presetKey }, EDITOR_NODE_KEYS);
  const routePrefix = `editor-${kind}`;
  const tableAddress = createPhiSignalAddress("cms", ids.widgetNews);
  const source: PhiProviderResourceSource = {
    providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
    resourceKey: kind,
  };
  const shared = { source, tableAddress, routePrefix };
  /*
   * What only a Publisher does: publish and withdraw, name the author and the category, and keep the
   * categories. Core refuses all of it to anybody else, so an Author's Page leaves it out rather than
   * offering buttons that can only fail.
   */
  const publishes = canPhiViewerAccess(runtime.viewer, PHI_VIEWER_ACCESS_PUBLISHING);
  const reviewRowActions: PhiTableActionDefinition[] = publishes
    ? [
      {
        key: "curate",
        label: widgetLabels.actions.curate,
        icon: "antd:user",
        display: "icon",
        execution: "signal",
      },
      {
        key: "publish",
        label: widgetLabels.actions.publish,
        icon: "antd:cloud-upload",
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
    ]
    : [
      {
        key: "submit",
        label: widgetLabels.actions.submit,
        icon: "antd:check",
        display: "icon",
        execution: "provider",
        // The version the row shows is already the one waiting for a Publisher.
        disabledWhen: { source: "row", valuePath: "submittedCurrent", operator: "truthy" },
        confirm: {
          title: widgetLabels.submit.title,
          description: widgetLabels.submit.description,
          okText: widgetLabels.actions.submit,
        },
      },
    ];

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_EDITOR_REGION_IDS.regionContent,
  });

  const nodes = createPhiCmsPresetNodes(page);
  /*
   * The same Form twice: once with nothing to read, once bound to the row that was pressed.
   *
   * Two dialogs rather than one, because a record-bound Form cannot be asked to start blank -- it waits
   * for a row, and a new entry has none. One dialog for both was the first attempt: it opened on the plus
   * and stayed a skeleton, because nothing was ever going to arrive.
   */
  /*
   * "Written in" offers the Site's languages and names its own one when left empty -- the Page knows
   * both, the registered Form does not (`site-locales-config.ts`).
   */
  const sourceLocale = runtime.site.availableLocales.find((option) => option.code === runtime.site.sourceLocale);
  const entryFormConfig = {
    [PHI_SITE_LOCALES_CONFIG_KEY]: runtime.site.availableLocales.map((option) => ({ code: option.code, label: option.label })),
    // What Core stores when the field is left empty: the Site's source language, not its default one.
    [PHI_CONTENT_ENTRY_SOURCE_LOCALE_PLACEHOLDER_CONFIG_KEY]: sourceLocale?.label ?? runtime.site.sourceLocale,
  };
  const createDialog = buildEntryDialogNodes(nodes, {
    ...shared,
    key: "create",
    title: kindLabels.createTitle,
    formId: formIds.entry,
    openActionKey: "new",
    bindsRecord: false,
    formConfig: entryFormConfig,
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: ids.overlayCreate,
      body: ids.layoutCreate,
      footer: ids.layoutCreateFooter,
      form: ids.widgetCreateForm,
      commands: ids.widgetCreateCommands,
    },
  });
  const entryDialog = buildEntryDialogNodes(nodes, {
    ...shared,
    key: "entry",
    title: kindLabels.entryTitle,
    formId: formIds.entry,
    openActionKey: "edit",
    bindsRecord: true,
    formConfig: entryFormConfig,
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: ids.overlayEntry,
      body: ids.layoutEntry,
      footer: ids.layoutEntryFooter,
      form: ids.widgetEntryForm,
      commands: ids.widgetEntryCommands,
    },
  });
  const publicationDialog = buildEntryDialogNodes(nodes, {
    ...shared,
    key: "publication",
    title: widgetLabels.overlays.publication,
    formId: formIds.publication,
    openActionKey: "publish",
    bindsRecord: true,
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: ids.overlayPublication,
      body: ids.layoutPublication,
      footer: ids.layoutPublicationFooter,
      form: ids.widgetPublicationForm,
      commands: ids.widgetPublicationCommands,
    },
  });

  const publisherParts = publishes
    ? buildPublisherParts({ nodes, ids, kind, routePrefix, entryShared: shared, widgetLabels, formIds })
    : null;

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [
      createDialog.overlay,
      entryDialog.overlay,
      publicationDialog.overlay,
      ...(publisherParts?.overlays ?? []),
    ],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      ...createDialog.layouts,
      ...entryDialog.layouts,
      ...publicationDialog.layouts,
      ...(publisherParts?.layouts ?? []),
    ],
    contentWidgets: [
      nodes.widget({
        id: ids.widgetNews,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 10,
        label: kindLabels.widgetLabel,
        config: {
          source,
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              {
                key: "title",
                fieldKey: "title",
                title: widgetLabels.columns.title,
                sizing: { mode: "fill" },
              },
              {
                key: "author",
                fieldKey: "author",
                title: widgetLabels.columns.author,
                sizing: { mode: "content" },
              },
              {
                key: "category",
                fieldKey: "category",
                title: widgetLabels.columns.category,
                sizing: { mode: "content" },
              },
              {
                key: "slug",
                fieldKey: "slug",
                title: widgetLabels.columns.slug,
                renderer: "code",
                sizing: { mode: "content" },
              },
              {
                key: "status",
                fieldKey: "status",
                title: widgetLabels.columns.status,
                renderer: "badge",
                // The Provider answers a word; these are the words a reader sees.
                valueMap: {
                  draft: widgetLabels.rowStatus.draft,
                  published: widgetLabels.rowStatus.published,
                  submitted: widgetLabels.rowStatus.submitted,
                },
                sizing: { mode: "content" },
              },
              {
                key: "sourceLocale",
                fieldKey: "sourceLocale",
                title: widgetLabels.columns.language,
                sizing: { mode: "content" },
              },
              {
                key: "tags",
                fieldKey: "tags",
                title: widgetLabels.columns.tags,
                renderer: "tags",
                sizing: { mode: "content" },
              },
              {
                key: "publishedAt",
                fieldKey: "publishedAt",
                title: widgetLabels.columns.published,
                renderer: "datetime",
                sizing: { mode: "content" },
              },
              {
                key: "expiresAt",
                fieldKey: "expiresAt",
                title: widgetLabels.columns.expires,
                renderer: "datetime",
                sizing: { mode: "content" },
              },
              {
                key: "updatedAt",
                fieldKey: "updatedAt",
                title: widgetLabels.columns.changed,
                renderer: "datetime",
                sizing: { mode: "content" },
              },
            ],
            emptyState: { title: kindLabels.emptyTitle, description: widgetLabels.empty.text },
            controlSize: "small",
            footer: {
              template: widgetLabels.footer,
              values: [{ key: "entries", value: { source: "core", fieldKey: "totalRows" } }],
              align: "start",
            },
          },
          features: {
            search: { enabled: true, placeholder: widgetLabels.searchPlaceholder },
            filters: [
              {
                key: "status",
                type: "select",
                label: widgetLabels.statusLabel,
                // "All", "Draft", "Published" say what they filter; the label stays the Control's name.
                labelPlacement: "none",
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
            tools: { mode: "self-contained", reset: false, reload: true },
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
                ...reviewRowActions,
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
             * One announcement, five listeners -- seven for a Publisher, whose curation dialog listens too.
             *
             * The Table says which action happened on which row and nothing more; each receiver decides
             * whether it was meant, by the `openActionKey` on its own config. That is why there is no
             * coordinator here: a dialog that does not recognise the action ignores it, and a Site that
             * adds a sixth receiver adds a route rather than a case in somebody's code.
             */
            emits: [
              ...[
                ids.overlayCreate,
                ids.overlayEntry,
                ids.widgetEntryForm,
                ids.overlayPublication,
                ids.widgetPublicationForm,
                ...(publishes ? [ids.overlayCuration, ids.widgetCurationForm] : []),
              ].map((receiverId, index) => ({
                routeKey: `${routePrefix}-table-action-${index}`,
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
              routeKey: `${routePrefix}-table-reload`,
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: tableAddress,
            }],
          },
        },
      }),
      ...createDialog.widgets,
      ...entryDialog.widgets,
      ...publicationDialog.widgets,
      ...(publisherParts?.widgets ?? []),
    ],
  };
}

/**
 * What a Publisher's editor Page has beyond an Author's: the curation dialog the entries Table opens, and
 * the kind's categories -- their own Table under the entries, with a dialog to write one in.
 *
 * The categories are a list of their own rather than something typed while writing (phis-server
 * CONTENT.md, Terms), and they stand on the same Page because they are the same kind's: whoever files
 * entries under them sees both at once.
 */
function buildPublisherParts({
  nodes,
  ids,
  kind,
  routePrefix,
  entryShared,
  widgetLabels,
  formIds,
}: {
  nodes: ReturnType<typeof createPhiCmsPresetNodes>;
  ids: Record<(typeof EDITOR_NODE_KEYS)[number], PhiCmsInstanceId>;
  kind: PhiContentEntryKind;
  routePrefix: string;
  entryShared: { source: PhiProviderResourceSource; tableAddress: PhiSignalAddress; routePrefix: string };
  widgetLabels: Awaited<ReturnType<typeof getPhiContentEntryEditorLabels>>;
  formIds: { curation: PhiFormId; category: PhiFormId };
}) {
  const categoriesSource: PhiProviderResourceSource = {
    providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategories,
    resourceKey: kind,
  };
  const categoriesAddress = createPhiSignalAddress("cms", ids.widgetCategories);
  const categoriesPrefix = `${routePrefix}-categories`;
  const categoriesShared = { source: categoriesSource, tableAddress: categoriesAddress, routePrefix: categoriesPrefix };
  const labels = widgetLabels.categories;

  const curationDialog = buildEntryDialogNodes(nodes, {
    ...entryShared,
    key: "curation",
    title: widgetLabels.overlays.curation,
    formId: formIds.curation,
    openActionKey: "curate",
    bindsRecord: true,
    // The empty choices in the page's language; the Options Provider reads them from here.
    formConfig: {
      [PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS.author]: widgetLabels.curation.authorNone,
      [PHI_CONTENT_ENTRY_CURATION_NONE_CONFIG_KEYS.category]: widgetLabels.curation.categoryNone,
    },
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: ids.overlayCuration,
      body: ids.layoutCuration,
      footer: ids.layoutCurationFooter,
      form: ids.widgetCurationForm,
      commands: ids.widgetCurationCommands,
    },
  });
  const categoryCreateDialog = buildEntryDialogNodes(nodes, {
    ...categoriesShared,
    key: "category-create",
    title: labels.overlays.create,
    formId: formIds.category,
    openActionKey: "new",
    bindsRecord: false,
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: ids.overlayCategoryCreate,
      body: ids.layoutCategoryCreate,
      footer: ids.layoutCategoryCreateFooter,
      form: ids.widgetCategoryCreateForm,
      commands: ids.widgetCategoryCreateCommands,
    },
  });
  const categoryEditDialog = buildEntryDialogNodes(nodes, {
    ...categoriesShared,
    key: "category-edit",
    title: labels.overlays.edit,
    formId: formIds.category,
    openActionKey: "edit",
    bindsRecord: true,
    saveLabel: widgetLabels.form.save,
    cancelLabel: widgetLabels.form.cancel,
    ids: {
      overlay: ids.overlayCategoryEdit,
      body: ids.layoutCategoryEdit,
      footer: ids.layoutCategoryEditFooter,
      form: ids.widgetCategoryEditForm,
      commands: ids.widgetCategoryEditCommands,
    },
  });

  const categoriesTable = nodes.widget({
    id: ids.widgetCategories,
    parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
    typeKey: "table",
    slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
    sortOrder: 20,
    label: labels.widgetLabel,
    config: {
      source: categoriesSource,
      presentation: {
        title: labels.title,
        layout: { mode: "auto", overflowX: "auto" },
        columns: [
          { key: "label", fieldKey: "label", title: labels.columns.label, sizing: { mode: "fill" } },
          { key: "slug", fieldKey: "slug", title: labels.columns.slug, renderer: "code", sizing: { mode: "content" } },
          { key: "sortOrder", fieldKey: "sortOrder", title: labels.columns.order, sizing: { mode: "content" } },
          { key: "entryCount", fieldKey: "entryCount", title: labels.columns.entries, sizing: { mode: "content" } },
        ],
        emptyState: { title: labels.empty.title, description: labels.empty.text },
        controlSize: "small",
        footer: {
          template: labels.footer,
          values: [{ key: "categories", value: { source: "core", fieldKey: "totalRows" } }],
          align: "start",
        },
      },
      features: {
        pagination: { enabled: false },
        sorting: { mode: "none" },
        tools: { mode: "self-contained", reset: false, reload: true },
        actions: {
          toolbar: [{
            key: "new",
            label: labels.actions.new,
            icon: "antd:plus",
            display: "icon",
            mode: "primary",
            execution: "signal",
          }],
          row: [
            { key: "edit", label: labels.actions.edit, icon: "edit", display: "icon", execution: "signal" },
            {
              key: "delete",
              label: labels.actions.delete,
              icon: "antd:delete",
              display: "icon",
              mode: "danger",
              execution: "provider",
              confirm: { title: labels.delete.title, description: labels.delete.description, okText: labels.actions.delete },
            },
          ],
        },
      },
      signalRoutes: {
        // The same announcement as the entries Table's, to this Table's own two dialogs.
        emits: [
          ids.overlayCategoryCreate,
          ids.overlayCategoryEdit,
          ids.widgetCategoryEditForm,
        ].map((receiverId, index) => ({
          routeKey: `${categoriesPrefix}-table-action-${index}`,
          capabilityId: "actionActivate",
          scope: "page" as const,
          channel: "action",
          action: "activate" as const,
          valueType: "json" as const,
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
          receiver: createPhiSignalAddress("cms", receiverId),
        })),
        listens: [{
          routeKey: `${categoriesPrefix}-table-reload`,
          capabilityId: "reload",
          scope: "page",
          channel: "reload",
          action: "activate",
          valueType: "none",
          receiver: categoriesAddress,
        }],
      },
    },
  });

  return {
    overlays: [curationDialog.overlay, categoryCreateDialog.overlay, categoryEditDialog.overlay],
    layouts: [...curationDialog.layouts, ...categoryCreateDialog.layouts, ...categoryEditDialog.layouts],
    widgets: [categoriesTable, ...curationDialog.widgets, ...categoryCreateDialog.widgets, ...categoryEditDialog.widgets],
  };
}
