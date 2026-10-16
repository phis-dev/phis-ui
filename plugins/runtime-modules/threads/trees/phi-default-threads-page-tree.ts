import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import {
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../../../types/signals";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../constants/thread-library-provider-keys";
import { PhisThreadKind, PhisThreadStatus } from "../../../../constants/threads";
import {
  createPhiThreadsControllerAddress,
  PHI_THREADS_CONTROLLER_INSTANCE_KEY,
  PHI_THREADS_CONTROLLER_TYPE,
} from "../controller/address";
import { createPhiThreadsPageIds } from "../addresses";
import type { PhiSidebarAreaKey } from "../../sidebar-route";
import { PHI_THREADS_FORM_IDS } from "../forms";
import { PHI_SHARED_FORM_IDS } from "../../../../components/forms/shared-form-ids";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { getPhiThreadPageLabels } from "../labels";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { PHI_DIALOG_BODY_CONFIG, PHI_DIALOG_COMMANDS_CONFIG } from "../../../../helpers/cms-dialog";

/** The content region of each Area's conversations Page. */
const SYNTHETIC_THREADS_REGION_ID_BY_AREA = {
  app: -453,
  accounting: -454,
  admin: -455,
  editor: -456,
  builder: -457,
} as const satisfies Record<PhiSidebarAreaKey, number>;

/**
 * The three surfaces of a conversation, placed and wired.
 *
 * None of them holds a conversation: the listing knows which one was chosen, the conversation knows
 * how to read one, and the composer knows how to write into one. What joins them is here and nowhere
 * else -- which is the point of the routes being configuration rather than a channel name agreed on
 * inside two clients. A Site may take one of the three out, put a Module's own listing in its place,
 * or place the pair on a page of its own, and none of the Widgets learns anything about it.
 *
 * The listing is a generic Table, so one thing is not configuration: a Table reports selected row
 * keys, and only the Module may say that such a key is a conversation. That translation is the
 * Controller below, and it is the reason the Page has a Controller at all.
 *
 * This Page is the offer, not the contract. What makes the arrangement reproducible is that every
 * route below could equally have been drawn in the Builder -- the Controller excepted, which still
 * names the Page's Widgets by id rather than by route (TODOS.md).
 */
export async function buildPhiDefaultThreadsPageTree({
  page,
  runtime,
  area,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  area: PhiSidebarAreaKey;
}): Promise<PhiResolvedCmsPageTree> {
  const { widgets: widgetIds, overlays: overlayIds, layouts: layoutIds } = createPhiThreadsPageIds(area);
  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiThreadPageLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });

  const controllerAddress = createPhiThreadsControllerAddress();
  const inboxAddress = createPhiSignalAddress("cms", widgetIds.widgetInbox);
  const conversationAddress = createPhiSignalAddress("cms", widgetIds.widgetConversation);
  const replyOverlayAddress = createPhiSignalAddress("cms", overlayIds.overlayReply);
  const replyFormAddress = createPhiSignalAddress("cms", widgetIds.widgetReplyForm);
  const formAddress = createPhiSignalAddress("cms", widgetIds.widgetNewForm);
  const overlayAddress = createPhiSignalAddress("cms", overlayIds.overlayNew);
  const saveButtonAddress = createPhiSignalSubcontrolAddress(
    "cms",
    widgetIds.widgetNewCommands,
    "save",
  );

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId: SYNTHETIC_THREADS_REGION_ID_BY_AREA[area],
  });

  const nodes = createPhiCmsPresetNodes(page);
  /*
   * Answering the open conversation, in a dialog of Core's shape with Core's Reply Form.
   *
   * The conversation's Reply names the thread as its row; the dialog opens on it and the Form reads the
   * thread from that row (`recordOpen`, the thread inbox as its `source`). Its success reaches the
   * Controller, which makes the reader catch up and the listing reorder, and closes the dialog itself.
   */
  const replyDialog = nodes.dialog({
    id: overlayIds.overlayReply,
    bodyLayoutNodeId: layoutIds.layoutReply,
    sortOrder: 1,
    label: "app-threads-reply-modal",
    config: {
      title: labels.composerLabel,
      mountPolicy: "remount",
      closeMode: "immediate",
      openActionKey: "reply",
      signalRoutes: {
        listens: [{
          routeKey: "app-threads-reply-open",
          capabilityId: "open",
          scope: "page",
          channel: "action",
          action: "activate",
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
          receiver: replyOverlayAddress,
        }, {
          routeKey: "app-threads-reply-close",
          capabilityId: "close",
          scope: "page",
          channel: "dialog",
          action: "close",
          valueType: "none",
          receiver: replyOverlayAddress,
        }],
      },
    },
    commands: {
      footerLayoutNodeId: layoutIds.layoutReplyFooter,
      widgetId: widgetIds.widgetReplyCommands,
      label: labels.composerLabel,
      flags: PhiCmsFlags.NoTranslate,
      config: {
        key: "app-threads-reply-commands",
        buttons: [
          { key: "cancel", emits: [{ capabilityId: "close", value: null }], action: "cancel", icon: "cancel" },
          {
            key: "submit",
            emits: [{ capabilityId: "submit", value: null }],
            label: labels.replySendLabel,
            variant: "primary",
            icon: "antd:send-outlined",
          },
        ],
        signalRoutes: {
          emits: [{
            routeKey: "app-threads-reply-cancel",
            capabilityId: "close",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: replyOverlayAddress,
          }, {
            routeKey: "app-threads-reply-commands-submit",
            capabilityId: "submit",
            scope: "page",
            channel: "submit",
            action: "activate",
            valueType: "none",
            receiver: replyFormAddress,
          }],
        },
      },
    },
  });
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta: {
      title: { msgId: 0, source: "Conversations", value: labels.title },
      description: {
        msgId: 0,
        source: "Everything you are part of, and where to answer it.",
        value: labels.description,
      },
    },
    /*
     * Who the Controller speaks to, said by the Page that arranges them.
     *
     * It used to reach into a preset id map from inside the Module, which is the coupling routes exist
     * to remove: a Site that rearranged this Page would have kept every Widget route and lost the
     * Controller. Now both directions are written here, in the same vocabulary -- the Widgets' `emits`
     * point at the Controller, and these point back.
     *
     * Declaring it does not mount it. The Controller is still `demand`, brought into being by a Widget
     * asking for its condition state; a setting only says what it is configured with when it is. The
     * materializer takes the Page's word over the demand's, so this is the one that carries.
     */
    controllerSettings: [{
      type: PHI_THREADS_CONTROLLER_TYPE,
      instanceKey: PHI_THREADS_CONTROLLER_INSTANCE_KEY,
      mountScope: "page",
      config: {
        signalRoutes: {
          emits: [
            {
              routeKey: "app-threads-controller-thread-conversation",
              capabilityId: "threadChange",
              scope: "page",
              channel: "thread",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            },
            /*
             * A reply landed in the conversation that is already open: it catches up rather than
             * switching, which is what keeps a half-written next message where it was.
             */
            {
              routeKey: "app-threads-controller-thread-reload",
              capabilityId: "threadReload",
              scope: "page",
              channel: "thread",
              action: "reload",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            },
            {
              routeKey: "app-threads-controller-reload-inbox",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: inboxAddress,
            },
            {
              routeKey: "app-threads-controller-dialog-open",
              capabilityId: "dialogOpen",
              scope: "page",
              channel: "dialog",
              action: "activate",
              valueType: "none",
              receiver: overlayAddress,
            },
            {
              routeKey: "app-threads-controller-dialog-close",
              capabilityId: "dialogClose",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: overlayAddress,
            },
            {
              routeKey: "app-threads-controller-form-submit",
              capabilityId: "formSubmit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: formAddress,
            },
            {
              routeKey: "app-threads-controller-form-reset",
              capabilityId: "formReset",
              scope: "page",
              channel: "reset",
              action: "activate",
              valueType: "none",
              receiver: formAddress,
            },
            {
              routeKey: "app-threads-controller-submitting",
              capabilityId: "submitting",
              scope: "page",
              channel: "submitting",
              action: "change",
              valueType: "boolean",
              receiver: saveButtonAddress,
            },
          ],
        },
      },
    }],
    /*
     * The dialog that holds the form, and nothing else about it.
     *
     * `remount` because a half-typed conversation that survives a close is a draft nobody asked to
     * keep, and `request` because closing one that is being submitted would leave a conversation half
     * opened with nobody watching -- the Controller decides, which is what "request" means.
     */
    overlays: [nodes.overlay({
      id: overlayIds.overlayNew,
      overlayType: "modal",
      bodyLayoutNodeId: layoutIds.layoutNew,
      footerPresentation: "actions",
      footerLayoutNodeId: layoutIds.layoutNewFooter,
      sortOrder: 0,
      label: "app-threads-new-modal",
      config: {
        title: labels.newConversationLabel,
        width: { compact: "calc(100vw - 32px)", medium: 560, wide: 600 },
        mountPolicy: "remount",
        closeMode: "request",
        signalRoutes: {
          emits: [{
            routeKey: "app-threads-new-state",
            capabilityId: "openChange",
            scope: "page",
            channel: "state",
            action: "change",
            valueType: "boolean",
            receiver: controllerAddress,
          }, {
            routeKey: "app-threads-new-close-request",
            capabilityId: "closeRequest",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
            receiver: controllerAddress,
          }],
          listens: [{
            routeKey: "app-threads-new-open",
            capabilityId: "open",
            scope: "page",
            channel: "dialog",
            action: "activate",
            valueType: "none",
            receiver: overlayAddress,
          }, {
            routeKey: "app-threads-new-close",
            capabilityId: "close",
            scope: "page",
            channel: "dialog",
            action: "close",
            valueType: "none",
            receiver: overlayAddress,
          }],
        },
      },
    }), replyDialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      ...replyDialog.layouts,
      nodes.layout({
        id: layoutIds.layoutNew,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "app threads new modal content",
        config: {
          ...PHI_DIALOG_BODY_CONFIG,
          anchor: { horizontal: "left", vertical: "top" },
        },
      }),
      nodes.layout({
        id: layoutIds.layoutNewFooter,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "app threads new modal footer",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        id: widgetIds.widgetInbox,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        /*
         * One slot index per child, not one slot with three children.
         *
         * The scaffold renders sequential slots: `buildSequentialSlots` assigns by `slotIndex`, so
         * three nodes sharing an index are three assignments to the same place and only the last
         * survives -- silently, because an overwritten node never reaches the tree that would have
         * reported it missing.
         */
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.inboxTitle,
        config: {
          source: {
            providerKey: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table,
            resourceKey: "inbox",
          },
          presentation: {
            title: labels.inboxTitle,
            controlSize: "small",
            // Fixed, because the subject is the one column that may be long and the only one worth
            // cutting short: a fixed layout is what lets a column say so, and it needs a fill column
            // to distribute what the others do not take.
            layout: { mode: "fixed", overflowX: "auto" },
            /*
             * Four columns, which is what a conversation is: what it is about, who it is with, where
             * it stands and when it last moved. The Provider answers in numbers and the columns draw
             * names, which is why every one of these maps rather than prints.
             */
            columns: [
              {
                key: "subject",
                fieldKey: "subject",
                title: labels.columns.subject,
                ellipsis: true,
                sizing: { mode: "fill", minWidth: 200 },
              },
              {
                key: "kind",
                fieldKey: "kind",
                title: labels.columns.kind,
                sizing: { mode: "fixed", width: 140 },
                valueMap: {
                  [String(PhisThreadKind.Direct)]: labels.kinds.direct,
                  [String(PhisThreadKind.Group)]: labels.kinds.group,
                  [String(PhisThreadKind.CrossGroup)]: labels.kinds.crossGroup,
                  [String(PhisThreadKind.Support)]: labels.kinds.support,
                },
              },
              {
                key: "state",
                fieldKey: "state",
                title: labels.columns.state,
                renderer: "badge",
                sizing: { mode: "fixed", width: 120 },
                valueMap: {
                  unread: labels.states.unread,
                  open: labels.states.open,
                  archived: labels.states.archived,
                },
                tagColorMap: { unread: "processing", open: "default", archived: "default" },
              },
              {
                key: "latestMessageAt",
                fieldKey: "latestMessageAt",
                title: labels.columns.activity,
                renderer: "datetime",
                sizing: { mode: "fixed", width: 180 },
              },
            ],
            emptyState: { title: labels.inboxEmpty, description: labels.inboxEmptyHint },
            // How many there are and how many wait to be read, across every page of the listing.
            footer: {
              template: labels.inboxFooter,
              values: [
                { key: "total", value: { source: "core", fieldKey: "totalRows" } },
                { key: "unread", value: { source: "provider", fieldKey: "unread" } },
              ],
              align: "start",
            },
          },
          features: {
            // Choosing one is the whole point of the listing, and a conversation is read one at a time.
            rowSelection: { mode: "single", preserveSelectedRowIdentities: true },
            pagination: { enabled: true, pageSize: 25, pageSizes: [10, 20, 50, 100] },
            // The route answers by last activity and takes no text, and the resource says so; these
            // repeat it where a person would otherwise be offered the control.
            sorting: { mode: "none" },
            search: { enabled: false },
            // An inbox goes stale by itself: the messages that change it are written by other people.
            tools: { mode: "self-contained", reload: true },
            /*
             * Two of the three filters the resource declares. `kind` is left out deliberately: this
             * Page is every conversation a person is in, and a Site that wants one kind pins it in the
             * Builder -- which is the case a Support page is.
             */
            filters: [
              {
                key: "status",
                type: "select",
                label: labels.filters.statusLabel,
                labelPlacement: "none",
                options: [
                  { value: String(PhisThreadStatus.Open), label: labels.filters.statusOpen },
                  { value: String(PhisThreadStatus.Archived), label: labels.filters.statusArchived },
                ],
              },
              {
                key: "unreadOnly",
                type: "boolean",
                control: "switch",
                label: labels.filters.unreadLabel,
                labelPlacement: "inline",
                defaultValue: false,
              },
            ],
            actions: {
              rowLayout: "compact",
              /*
               * The `+` runs nothing: it says an action was activated, and the Controller decides that
               * this one opens a dialog. A Table that opened an Overlay would have to know there is
               * one.
               */
              toolbar: [{
                key: "newConversation",
                label: labels.newConversationLabel,
                icon: "plus",
                display: "icon",
                mode: "primary",
                execution: "signal",
              }],
              /*
               * Both actions run through the Provider, and each is visible only where it means
               * something: the resource already says so, and repeating the condition here would be a
               * second opinion about it.
               */
              /*
               * Named rather than drawn. Only one of the two is ever on a row, so there is no column of
               * repeated buttons to compress -- and the icon vocabulary has no mark for archiving that
               * does not already mean deleting or retiring, which is the one thing this must not say.
               */
              row: [{
                key: "archive",
                label: labels.actions.archive,
                display: "label",
                execution: "provider",
                confirm: {
                  title: labels.actions.archiveConfirmTitle,
                  description: labels.actions.archiveConfirmText,
                  okText: labels.actions.archiveConfirmOk,
                  cancelText: labels.actions.confirmCancel,
                },
              }, {
                key: "reopen",
                label: labels.actions.reopen,
                display: "label",
                execution: "provider",
              }],
            },
          },
          signalRoutes: {
            /*
             * One route out, to the Controller, and it carries what a Table has to say: which rows are
             * selected. That a row key is a conversation id is not a Table's to know, so the listing
             * says no more than it can and the Controller says the rest.
             */
            emits: [{
              routeKey: "app-threads-selection",
              capabilityId: "selectionChange",
              scope: "page",
              channel: "selection",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableSelection,
              receiver: controllerAddress,
            }, {
              routeKey: "app-threads-table-action",
              capabilityId: "actionActivate",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: controllerAddress,
            }, {
              /*
               * The route that mounts the Controller at all. A Controller kept on demand is brought in
               * by a Widget asking it for the condition state, so the Page has to ask -- even here,
               * where the answer never varies and nothing on the Page is gated by it.
               */
              routeKey: "app-threads-condition",
              capabilityId: "conditionStateRequest",
              scope: "page",
              channel: "condition",
              action: "reload",
              valueType: "none",
              receiver: controllerAddress,
            }],
            // A message written on this Page reorders the listing, and the Table is the one surface
            // that cannot notice: it reloads after its own mutations, not after somebody else's.
            listens: [{
              routeKey: "app-threads-inbox-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: inboxAddress,
            }],
          },
        },
      }),
      /*
       * The form that opens a conversation, and the two buttons that run it.
       *
       * Both live inside the dialog, which is why neither is on a slot of the Page: an Overlay's Body
       * and Footer are Layouts of their own. The buttons stand outside the Form on purpose -- a modal
       * has one footer, and it is the dialog's.
       */
      nodes.widget({
        id: widgetIds.widgetNewForm,
        parentLayoutNodeId: layoutIds.layoutNew,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.newConversationLabel,
        config: {
          formId: PHI_THREADS_FORM_IDS.newConversation,
          formConfig: {},
          execution: { mode: "handler" },
          source: null,
          signalRoutes: {
            emits: [{
              routeKey: "app-threads-new-success",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
              receiver: controllerAddress,
            }, {
              routeKey: "app-threads-new-submitting",
              capabilityId: "submitting",
              scope: "page",
              channel: "submitting",
              action: "change",
              valueType: "boolean",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "app-threads-new-submit",
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: formAddress,
            }, {
              routeKey: "app-threads-new-reset",
              capabilityId: "reset",
              scope: "page",
              channel: "reset",
              action: "activate",
              valueType: "none",
              receiver: formAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetNewCommands,
        parentLayoutNodeId: layoutIds.layoutNewFooter,
        typeKey: "command-toolbar",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.openConversationLabel,
        config: {
          key: "app-threads-new-commands",
          ...PHI_DIALOG_COMMANDS_CONFIG,
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], label: labels.cancelLabel, icon: "cancel" },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], label: labels.openConversationLabel, variant: "primary", icon: "save" },
          ],
          signalRoutes: {
            emits: [{
              routeKey: "app-threads-new-command",
              capabilityId: "command",
              scope: "page",
              channel: "command",
              action: "activate",
              valueType: "string",
              receiver: controllerAddress,
            }],
            listens: [{
              routeKey: "app-threads-new-save-loading",
              capabilityId: "loading",
              scope: "page",
              channel: "submitting",
              action: "change",
              valueType: "boolean",
              receiver: saveButtonAddress,
            }],
          },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetConversation,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "thread-conversation",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 1,
        sortOrder: 1,
        label: labels.title,
        config: {
          reply: true,
          signalRoutes: {
            // A conversation opened from `?thread=` reaches the Controller, which knows it is open.
            emits: [{
              routeKey: "app-threads-conversation-opened",
              capabilityId: "opened",
              scope: "page",
              channel: "opened",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: controllerAddress,
            }, {
              // Reply: one announcement, two listeners -- the dialog opens on it, the Form reads its row.
              routeKey: "app-threads-conversation-reply",
              capabilityId: "reply",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: replyOverlayAddress,
            }, {
              routeKey: "app-threads-conversation-reply-record",
              capabilityId: "reply",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: replyFormAddress,
            }],
            listens: [{
              routeKey: "app-threads-conversation-select",
              capabilityId: "select",
              scope: "page",
              channel: "thread",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            }, {
              routeKey: "app-threads-conversation-reload",
              capabilityId: "reload",
              scope: "page",
              channel: "thread",
              action: "reload",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
              receiver: conversationAddress,
            }],
          },
        },
      }),
      /*
       * Writing into the open conversation: Core's Reply Form, in the dialog above.
       *
       * It reads its thread from the row the conversation's Reply named, through the thread inbox as its
       * `source` -- so it cannot be pointed at a conversation other than the one the Reply was pressed in.
       * It reports its success to the Controller, which is what makes the surfaces around it live: the
       * conversation catches up and the listing reorders; and to the dialog, which closes.
       */
      nodes.widget({
        id: widgetIds.widgetReplyForm,
        parentLayoutNodeId: layoutIds.layoutReply,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: labels.composerLabel,
        flags: PhiCmsFlags.NoTranslate,
        config: {
          formId: PHI_SHARED_FORM_IDS.threadReply,
          formConfig: {},
          execution: { mode: "handler" },
          source: { providerKey: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table, resourceKey: "inbox" },
          openActionKey: "reply",
          feedback: { mode: "message" },
          signalRoutes: {
            emits: [{
              routeKey: "app-threads-reply-success",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
              receiver: controllerAddress,
            }, {
              routeKey: "app-threads-reply-success-close",
              capabilityId: "submitSuccess",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: replyOverlayAddress,
            }],
            listens: [{
              routeKey: "app-threads-reply-submit",
              capabilityId: "submit",
              scope: "page",
              channel: "submit",
              action: "activate",
              valueType: "none",
              receiver: replyFormAddress,
            }, {
              routeKey: "app-threads-reply-record-open",
              capabilityId: "recordOpen",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: replyFormAddress,
            }],
          },
        },
      }),
      ...replyDialog.widgets,
    ],
  };
}
