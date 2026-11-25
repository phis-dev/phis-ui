import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { canPhiViewerAccess } from "../../../../types/access";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalReceiver, type PhiSignalValueSchema } from "../../../../types/signals";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../constants/thread-library-provider-keys";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import { PhisThreadKind } from "../../../../constants/threads";
import { PHI_SHARED_FORM_IDS } from "../../../../components/forms/shared-form-ids";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../../../components/regions/presets/phi-base-page-layout";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { PHI_DIALOG_WIDTH_SINGLE_COLUMN } from "../../../../helpers/cms-dialog";
import {
  createPhiThreadsControllerAddress,
  PHI_THREADS_CONTROLLER_INSTANCE_KEY,
  PHI_THREADS_CONTROLLER_TYPE,
} from "../../../../constants/threads-controller-address";
import {
  PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS,
  PHI_CUSTOMER_FILE_RESOURCE_KEYS as RESOURCES,
  PHI_CUSTOMER_FILE_OWN_FILE_PARAM,
} from "../../../../constants/customer-file";
import { PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_IDS } from "../ids";
import { PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS } from "../customer-file-access";
import { getPhiAccountingCustomerFilePageLabels } from "./accounting-customer-file-label-set";

/** The content region of the customer file Page. */
const SYNTHETIC_CUSTOMER_FILE_REGION_ID = -459;

/**
 * Staff's customer file on one member (phis-server `GET /api/site/members/{userId}/file`): who they are and
 * how to reach them, where they live, their file and the conversations they are in.
 *
 * A Page of the Accounting Module, beside the product directory, built from what the conversations Page
 * already is and bound by Foundation names only (`constants/customer-file.ts`,
 * `constants/threads-controller-address.ts`): the Table and Collection Providers and the Conversations
 * Controller are the conversations Module's, which is active in the Accounting Area by default and has to
 * be for this Page to read anything. Above everything stands the member select, Core's member picker
 * (the `site-members` options with Core's search, which matches names, e-mail addresses and telephone
 * numbers), because it is the input of everything below it; its value goes to the Conversations
 * Controller, so one choice fills the Page with one request: the Controller hands the member to the person
 * and the conversations Tables as filters and to the addresses tiles as binding params (Core's address
 * renderer, read-only), joins the Tables' read for the file's id and hands it to the file
 * panel, a conversation reader whose "Add note" opens Core's Reply Form
 * in a dialog of its own (every message of a file is internal). The conversations Table lists the person's
 * conversations, the file not among them, and choosing a row is the conversations Page's choreography
 * unchanged: the Controller makes the selection a thread, the conversation reader below reads it, and its
 * Reply opens the Reply dialog with the internal note offered.
 *
 * The Page is for the holders of `accounting` (`PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS`), who read every
 * field, the addresses included. A viewer the Area admits without it is told so in the Page and nothing is
 * read for them; a Supporter's file is the Support Module's Page over the same route.
 */
export async function buildPhiDefaultAccountingCustomerFilePageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const { widgets: widgetIds, overlays: overlayIds, layouts: layoutIds } = PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_IDS;
  const credentials = readPhiServerApiCredentials();
  const labelOptions = {
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  };
  const labels = await getPhiAccountingCustomerFilePageLabels(labelOptions);

  const nodes = createPhiCmsPresetNodes(page);
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_CUSTOMER_FILE_REGION_ID });
  const pageMeta = {
    title: { msgId: 0, source: "Customer file", value: labels.title },
    description: {
      msgId: 0,
      source: "One member of the site: how to reach them, where they are, their file and their conversations.",
      value: labels.description,
    },
  };
  if (!canPhiViewerAccess(runtime.viewer, PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS)) {
    return {
      page: nodes.page({ pageType: PhiCmsPageType.Standard }),
      pageMeta,
      regions: [scaffold.region],
      layoutNodes: [scaffold.layoutNode],
      overlays: [],
      contentWidgets: [nodes.widget({
        id: widgetIds.widgetPerson,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "simple-text",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.title,
        flags: PhiCmsFlags.NoTranslate,
        config: { text: labels.notStaff, tone: "secondary" },
      })],
    };
  }

  const controllerAddress = createPhiThreadsControllerAddress();
  const addressesAddress = createPhiSignalAddress("cms", widgetIds.widgetAddresses);
  const fileAddress = createPhiSignalAddress("cms", widgetIds.widgetFile);
  const personAddress = createPhiSignalAddress("cms", widgetIds.widgetPerson);
  const threadsAddress = createPhiSignalAddress("cms", widgetIds.widgetThreads);
  const conversationAddress = createPhiSignalAddress("cms", widgetIds.widgetConversation);
  const noteOverlayAddress = createPhiSignalAddress("cms", overlayIds.overlayNote);
  const noteFormAddress = createPhiSignalAddress("cms", widgetIds.widgetNoteForm);
  const replyOverlayAddress = createPhiSignalAddress("cms", overlayIds.overlayReply);
  const replyFormAddress = createPhiSignalAddress("cms", widgetIds.widgetReplyForm);
  const route = (routeKey: string, capabilityId: string, channel: string, action: "change" | "activate" | "reload" | "close", receiver: PhiSignalReceiver, valueType: "json" | "string" | "none" = "none", valueSchema?: PhiSignalValueSchema) => ({
    routeKey,
    capabilityId,
    scope: "page" as const,
    channel,
    action,
    valueType,
    ...(valueSchema ? { valueSchema } : {}),
    receiver,
  });
  const memberFilters = (routeKey: string, receiver: PhiSignalReceiver) =>
    route(routeKey, "filtersChange", "filters", "change", receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableFilters);
  const tableAction = (routeKey: string, capabilityId: string, receiver: PhiSignalReceiver) =>
    route(routeKey, capabilityId, "action", "activate", receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableAction);
  const threadRoute = (routeKey: string, capabilityId: string, action: "change" | "reload", receiver: PhiSignalReceiver) =>
    route(routeKey, capabilityId, "thread", action, receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.threadSelection);
  const prefix = "accounting-customer-file";
  // What each Table says where its rows would be when the reader chooses themselves (Core refuses that file).
  const ownFile = { [PHI_CUSTOMER_FILE_OWN_FILE_PARAM]: labels.ownFile };

  /*
   * Core's Reply Form in a dialog, once for a note in the file and once for a reply in the conversation:
   * each opens on its own reader's Reply and reads its thread from the row that Reply named. Every message
   * of a file is internal (Core), so the note offers no audience; the reply offers the internal note.
   */
  const writeDialog = (kind: "note" | "reply") => {
    const note = kind === "note";
    const overlayAddress = note ? noteOverlayAddress : replyOverlayAddress;
    const formAddress = note ? noteFormAddress : replyFormAddress;
    const title = note ? labels.note.title : labels.reply.title;
    const dialog = nodes.dialog({
      id: note ? overlayIds.overlayNote : overlayIds.overlayReply,
      bodyLayoutNodeId: note ? layoutIds.layoutNote : layoutIds.layoutReply,
      sortOrder: note ? 0 : 1,
      label: `${prefix}-${kind}-modal`,
      config: {
        title,
        size: { width: PHI_DIALOG_WIDTH_SINGLE_COLUMN },
        mountPolicy: "remount",
        closeMode: "immediate",
        openActionKey: "reply",
        signalRoutes: {
          listens: [
            tableAction(`${prefix}-${kind}-open`, "open", overlayAddress),
            route(`${prefix}-${kind}-close`, "close", "dialog", "close", overlayAddress),
          ],
        },
      },
      commands: {
        footerLayoutNodeId: note ? layoutIds.layoutNoteFooter : layoutIds.layoutReplyFooter,
        widgetId: note ? widgetIds.widgetNoteCommands : widgetIds.widgetReplyCommands,
        label: title,
        flags: PhiCmsFlags.NoTranslate,
        config: {
          key: `${prefix}-${kind}-commands`,
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "close", value: null }], action: "cancel", icon: "close" },
            {
              key: "submit",
              emits: [{ capabilityId: "submit", value: null }],
              label: note ? labels.note.save : labels.reply.send,
              variant: "primary",
              icon: note ? "save" : "antd:send-outlined",
            },
          ],
          signalRoutes: {
            emits: [
              route(`${prefix}-${kind}-cancel`, "close", "dialog", "close", overlayAddress),
              route(`${prefix}-${kind}-commands-submit`, "submit", "submit", "activate", formAddress),
            ],
          },
        },
      },
    });
    const form = nodes.widget({
      id: formAddress === noteFormAddress ? widgetIds.widgetNoteForm : widgetIds.widgetReplyForm,
      parentLayoutNodeId: note ? layoutIds.layoutNote : layoutIds.layoutReply,
      typeKey: "form",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      label: title,
      flags: PhiCmsFlags.NoTranslate,
      config: {
        formId: PHI_SHARED_FORM_IDS.threadReply,
        // A reply may be an internal note; in the file every message is one (Core), so there is nothing to choose.
        ...(note ? {} : { formConfig: { initialValues: { internalAllowed: true } } }),
        execution: { mode: "handler" },
        source: { providerKey: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table, resourceKey: "inbox" },
        openActionKey: "reply",
        feedback: { mode: "message" },
        signalRoutes: {
          emits: [
            route(`${prefix}-${kind}-success`, "submitSuccess", "submit", "activate", controllerAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.formResult),
            route(`${prefix}-${kind}-success-close`, "submitSuccess", "dialog", "close", overlayAddress),
          ],
          listens: [
            route(`${prefix}-${kind}-submit`, "submit", "submit", "activate", formAddress),
            tableAction(`${prefix}-${kind}-record-open`, "recordOpen", formAddress),
          ],
        },
      },
    });
    return { dialog, form };
  };
  const noteDialog = writeDialog("note");
  const replyDialog = writeDialog("reply");

  /*
   * A conversation reader: the file's, which the Controller hands the member's file, and the listing's,
   * which it hands the chosen conversation. Each Reply opens its own dialog and reads its own Form, and
   * reaches the Controller too, which then knows where the message landed.
   */
  const reader = (kind: "file" | "conversation") => {
    const file = kind === "file";
    const address = file ? fileAddress : conversationAddress;
    const overlayAddress = file ? noteOverlayAddress : replyOverlayAddress;
    const formAddress = file ? noteFormAddress : replyFormAddress;
    return {
      reply: true,
      ...(file ? { title: labels.file.title, replyLabel: labels.file.add, emptyDescription: labels.file.empty } : { emptyDescription: labels.conversation.empty }),
      signalRoutes: {
        emits: [
          ...(file ? [] : [
            // A conversation opened from `?thread=` reaches the Controller, which knows it is open.
            route(`${prefix}-conversation-opened`, "opened", "opened", "change", controllerAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.threadSelection),
          ]),
          tableAction(`${prefix}-${kind}-reply`, "reply", overlayAddress),
          tableAction(`${prefix}-${kind}-reply-record`, "reply", formAddress),
          tableAction(`${prefix}-${kind}-reply-controller`, "reply", controllerAddress),
        ],
        listens: [
          threadRoute(`${prefix}-${kind}-select`, "select", "change", address),
          threadRoute(`${prefix}-${kind}-reload`, "reload", "reload", address),
        ],
      },
    };
  };

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta,
    /*
     * The Conversations Controller, configured as on the conversations Page -- the chosen conversation to
     * its reader, the listing read again after a reply -- and with this Page's part: the member's file to
     * the file panel when the member select chooses one, read again after a note, and the member to
     * the Tables and the addresses.
     */
    controllerSettings: [{
      type: PHI_THREADS_CONTROLLER_TYPE,
      instanceKey: PHI_THREADS_CONTROLLER_INSTANCE_KEY,
      mountScope: "page",
      config: {
        signalRoutes: {
          emits: [
            threadRoute(`${prefix}-controller-thread`, "threadChange", "change", conversationAddress),
            threadRoute(`${prefix}-controller-thread-reload`, "threadReload", "reload", conversationAddress),
            threadRoute(`${prefix}-controller-file`, "fileThreadChange", "change", fileAddress),
            threadRoute(`${prefix}-controller-file-reload`, "fileThreadReload", "reload", fileAddress),
            route(`${prefix}-controller-reload-threads`, "reload", "reload", "activate", threadsAddress),
            // The member chosen, as the Tables' filters and as the addresses tiles' binding params.
            route(`${prefix}-controller-person`, "memberFiltersChange", "filters", "change", personAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableFilters),
            route(`${prefix}-controller-threads`, "memberFiltersChange", "filters", "change", threadsAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableFilters),
            route(`${prefix}-controller-addresses`, "memberParamsChange", "bindingParams", "change", addressesAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams),
          ],
        },
      },
    }],
    overlays: [noteDialog.dialog.overlay, replyDialog.dialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      // The member select's row, first on the Page: it is the input of everything below it.
      nodes.layout({
        id: layoutIds.layoutMember,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `${prefix} member row`,
        // Flush with the Tables below: the Region holds the Page's inset.
        config: { padding: 0, paddingLeft: 0, paddingRight: 0 },
      }),
      ...noteDialog.dialog.layouts,
      ...replyDialog.dialog.layouts,
    ],
    contentWidgets: [
      /*
       * Core's member picker as a select of its own, labelled in front, searched on the server. It may be
       * cleared, so it starts with nobody chosen; its value, the user id as text (`""` once cleared), goes
       * to the Controller, which hands it to everything below.
       */
      nodes.widget({
        id: widgetIds.widgetMember,
        parentLayoutNodeId: layoutIds.layoutMember,
        typeKey: "select-box",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.person.picker,
        config: {
          key: `${prefix}-member`,
          label: labels.person.picker,
          description: labels.person.pickerHint,
          allowClear: true,
          optionsProvider: {
            providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers,
            loadMode: "server",
            search: { enabled: true, minChars: 2 },
          },
          signalRoutes: {
            emits: [
              route(`${prefix}-member-to-controller`, "change", "member", "change", controllerAddress, "string"),
            ],
          },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetPerson,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 1,
        sortOrder: 1,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.person.label,
        config: {
          source: { providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table, resourceKey: RESOURCES.person, params: ownFile },
          presentation: {
            title: labels.person.title,
            controlSize: "small",
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "displayName", fieldKey: "displayName", title: labels.person.columns.displayName, sizing: { mode: "content", minWidth: 120 } },
              { key: "fullName", fieldKey: "fullName", title: labels.person.columns.name, sizing: { mode: "content", minWidth: 120 } },
              { key: "companyName", fieldKey: "companyName", title: labels.person.columns.company, sizing: { mode: "content", minWidth: 120 } },
              { key: "email", fieldKey: "email", title: labels.person.columns.email, renderer: "email", sizing: { mode: "fill", minWidth: 200 } },
              { key: "phone", fieldKey: "phone", title: labels.person.columns.phone, sizing: { mode: "content", minWidth: 120 } },
              { key: "mobile", fieldKey: "mobile", title: labels.person.columns.mobile, sizing: { mode: "content", minWidth: 120 } },
            ],
            emptyState: { title: labels.person.empty },
            footer: {
              template: labels.person.footer,
              values: [{ key: "member", value: { source: "provider", fieldKey: "userId" } }],
              // Nobody chosen: nothing to say under the Table.
              variants: [{ when: { value: { source: "provider", fieldKey: "userId" }, operator: "falsy" }, template: "" }],
              align: "start",
            },
            // One row, the member chosen.
            loadingRows: 1,
          },
          features: {
            // The first page at the conversations Table's size, so the two read the member with one request.
            pagination: { enabled: false, pageSize: 25 },
            sorting: { mode: "none" },
            search: { enabled: false },
            tools: { mode: "self-contained", reset: false, reload: true },
          },
          signalRoutes: {
            // The member chosen, from the Controller, as the `userId` filter the Provider reads.
            listens: [memberFilters(`${prefix}-person-member`, personAddress)],
          },
        },
      }),
      /*
       * The member's addresses as Core's address tiles, read-only: the resource declares no action. The
       * member arrives from the Controller as the binding param `userId`, and the read is the one the
       * Tables and the Controller make for the choice, joined.
       */
      nodes.widget({
        id: widgetIds.widgetAddresses,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "collection-view",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 2,
        sortOrder: 2,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.addresses.label,
        config: {
          source: { providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.addresses, resourceKey: RESOURCES.addresses, params: ownFile },
          presentation: {
            title: labels.addresses.title,
            mode: "grid",
            controlSize: "small",
            emptyDescription: labels.addresses.empty,
            labels: { purposes: labels.addresses.purposes },
          },
          features: {
            tools: { mode: "self-contained", reset: false, reload: false },
            pagination: { enabled: false },
          },
          signalRoutes: {
            listens: [
              route(`${prefix}-addresses-member`, "bindingParamsChange", "bindingParams", "change", addressesAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams),
            ],
          },
        },
      }),
      // The member's file: its entries, internal notes and what Add-ons wrote with their links, and "Add note".
      nodes.widget({
        id: widgetIds.widgetFile,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "thread-conversation",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 3,
        sortOrder: 3,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.file.label,
        config: reader("file"),
      }),
      nodes.widget({
        id: widgetIds.widgetThreads,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 4,
        sortOrder: 4,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.threads.label,
        config: {
          source: { providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table, resourceKey: RESOURCES.threads, params: ownFile },
          presentation: {
            title: labels.threads.title,
            controlSize: "small",
            // Fixed, as on the conversations Page: the subject is the one column worth cutting short.
            layout: { mode: "fixed", overflowX: "auto" },
            columns: [
              { key: "subject", fieldKey: "subject", title: labels.threads.columns.subject, ellipsis: true, sizing: { mode: "fill", minWidth: 200 } },
              {
                key: "kind",
                fieldKey: "kind",
                title: labels.threads.columns.kind,
                sizing: { mode: "fixed", width: 140 },
                valueMap: {
                  [String(PhisThreadKind.Direct)]: labels.threads.kinds.direct,
                  [String(PhisThreadKind.Group)]: labels.threads.kinds.group,
                  [String(PhisThreadKind.CrossGroup)]: labels.threads.kinds.crossGroup,
                  [String(PhisThreadKind.Support)]: labels.threads.kinds.support,
                },
              },
              {
                key: "state",
                fieldKey: "state",
                title: labels.threads.columns.state,
                renderer: "badge",
                sizing: { mode: "fixed", width: 120 },
                valueMap: labels.threads.states,
                tagColorMap: { unread: "processing", open: "default", archived: "default", locked: "warning" },
              },
              { key: "latestMessageAt", fieldKey: "latestMessageAt", title: labels.threads.columns.activity, renderer: "datetime", sizing: { mode: "fixed", width: 180 } },
            ],
            emptyState: { title: labels.threads.empty, description: labels.threads.emptyHint },
            footer: {
              template: labels.threads.footer,
              values: [
                { key: "threads", value: { source: "core", fieldKey: "pageRows" } },
                { key: "page", value: { source: "core", fieldKey: "page" } },
              ],
              // Nothing on the page: the empty state says it.
              variants: [{ when: { value: { source: "core", fieldKey: "pageRows" }, operator: "falsy" }, template: "" }],
              align: "start",
            },
          },
          features: {
            // Choosing one opens it below, as on the conversations Page.
            rowSelection: { mode: "single", preserveSelectedRowIdentities: true },
            pagination: { enabled: true, pageSize: 25 },
            sorting: { mode: "none" },
            search: { enabled: false },
            tools: { mode: "self-contained", reset: false, reload: true },
          },
          signalRoutes: {
            emits: [
              route(`${prefix}-threads-selection`, "selectionChange", "selection", "change", controllerAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableSelection),
              // Asking for the condition state is what mounts the Controller, which is kept on demand.
              route(`${prefix}-threads-condition`, "conditionStateRequest", "condition", "reload", controllerAddress),
            ],
            listens: [
              memberFilters(`${prefix}-threads-member`, threadsAddress),
              route(`${prefix}-threads-reload`, "reload", "reload", "activate", threadsAddress),
            ],
          },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetConversation,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "thread-conversation",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 5,
        sortOrder: 5,
        // The Module's Label Set, translated already.
        flags: PhiCmsFlags.NoTranslate,
        label: labels.conversation.label,
        config: reader("conversation"),
      }),
      noteDialog.form,
      replyDialog.form,
      ...noteDialog.dialog.widgets,
      ...replyDialog.dialog.widgets,
    ],
  };
}
