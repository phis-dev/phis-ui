import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { canPhiViewerAccess } from "../../../../types/access";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalReceiver, type PhiSignalValueSchema } from "../../../../types/signals";
import type { PhiTableColumnDefinition } from "../../../../types/table-widget";
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
  PHI_CUSTOMER_FILE_SUBJECT_PARAM,
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
 * `constants/threads-controller-address.ts`): the Table Provider and the Conversations Controller are the
 * conversations Module's, which is active in the Accounting Area by default and has to be for this Page
 * to read anything. The person Table's filter is Core's member picker
 * (the `site-members` options with Core's search, which matches names, e-mail addresses and telephone
 * numbers); its query goes to the addresses and the threads Tables, so one choice fills all three. The
 * threads Table lists the person's file first, and choosing a row is the conversations Page's choreography
 * unchanged: the Conversations Controller makes the selection a thread, the conversation reads it, and its
 * Reply opens Core's Reply Form in a dialog -- with the internal note offered, which is every message of a
 * file anyway.
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
  const threadsAddress = createPhiSignalAddress("cms", widgetIds.widgetThreads);
  const conversationAddress = createPhiSignalAddress("cms", widgetIds.widgetConversation);
  const replyOverlayAddress = createPhiSignalAddress("cms", overlayIds.overlayReply);
  const replyFormAddress = createPhiSignalAddress("cms", widgetIds.widgetReplyForm);
  const route = (routeKey: string, capabilityId: string, channel: string, action: "change" | "activate" | "reload" | "close", receiver: PhiSignalReceiver, valueType: "json" | "none" = "none", valueSchema?: PhiSignalValueSchema) => ({
    routeKey,
    capabilityId,
    scope: "page" as const,
    channel,
    action,
    valueType,
    ...(valueSchema ? { valueSchema } : {}),
    receiver,
  });
  // The member chosen above, handed on as the query the two lists below read it from.
  const personQueryTo = (routeKey: string, receiver: PhiSignalReceiver) =>
    route(routeKey, "queryChange", "query", "change", receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableQuery);
  const queryInput = (routeKey: string, receiver: PhiSignalReceiver) =>
    route(routeKey, "queryChange", "query", "change", receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableQuery);
  const tableAction = (routeKey: string, capabilityId: string, receiver: PhiSignalReceiver) =>
    route(routeKey, capabilityId, "action", "activate", receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.tableAction);
  const threadRoute = (routeKey: string, capabilityId: string, action: "change" | "reload", receiver: PhiSignalReceiver) =>
    route(routeKey, capabilityId, "thread", action, receiver, "json", PHI_SIGNAL_VALUE_SCHEMAS.threadSelection);
  const prefix = "accounting-customer-file";

  const replyDialog = nodes.dialog({
    id: overlayIds.overlayReply,
    bodyLayoutNodeId: layoutIds.layoutReply,
    sortOrder: 0,
    label: `${prefix}-reply-modal`,
    config: {
      title: labels.noteLabel,
      width: PHI_DIALOG_WIDTH_SINGLE_COLUMN,
      mountPolicy: "remount",
      closeMode: "immediate",
      openActionKey: "reply",
      signalRoutes: {
        listens: [
          tableAction(`${prefix}-reply-open`, "open", replyOverlayAddress),
          route(`${prefix}-reply-close`, "close", "dialog", "close", replyOverlayAddress),
        ],
      },
    },
    commands: {
      footerLayoutNodeId: layoutIds.layoutReplyFooter,
      widgetId: widgetIds.widgetReplyCommands,
      label: labels.noteLabel,
      flags: PhiCmsFlags.NoTranslate,
      config: {
        key: `${prefix}-reply-commands`,
        buttons: [
          { key: "cancel", emits: [{ capabilityId: "close", value: null }], action: "cancel", icon: "close" },
          {
            key: "submit",
            emits: [{ capabilityId: "submit", value: null }],
            label: labels.replySendLabel,
            variant: "primary",
            icon: "antd:send-outlined",
          },
        ],
        signalRoutes: {
          emits: [
            route(`${prefix}-reply-cancel`, "close", "dialog", "close", replyOverlayAddress),
            route(`${prefix}-reply-commands-submit`, "submit", "submit", "activate", replyFormAddress),
          ],
        },
      },
    },
  });

  const addressColumns: PhiTableColumnDefinition[] = [
    { key: "name", fieldKey: "name", title: labels.addresses.columns.name, sizing: { mode: "content" } },
    { key: "lines", fieldKey: "lines", title: labels.addresses.columns.address, sizing: { mode: "fill" } },
    {
      key: "purposes",
      fieldKey: "purposes",
      title: labels.addresses.columns.purposes,
      renderer: "tags",
      sizing: { mode: "content" },
      valueMap: labels.addresses.purposes,
      tagColorMap: { billing: "default", shipping: "default", defaultBilling: "processing", defaultShipping: "processing" },
    },
  ];

  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    pageMeta,
    // The Conversations Controller, configured as on the conversations Page: the thread to the reader, and
    // the list read again after a note landed.
    controllerSettings: [{
      type: PHI_THREADS_CONTROLLER_TYPE,
      instanceKey: PHI_THREADS_CONTROLLER_INSTANCE_KEY,
      mountScope: "page",
      config: {
        signalRoutes: {
          emits: [
            threadRoute(`${prefix}-controller-thread`, "threadChange", "change", conversationAddress),
            threadRoute(`${prefix}-controller-thread-reload`, "threadReload", "reload", conversationAddress),
            route(`${prefix}-controller-reload-threads`, "reload", "reload", "activate", threadsAddress),
          ],
        },
      },
    }],
    overlays: [replyDialog.overlay],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode, ...replyDialog.layouts],
    contentWidgets: [
      nodes.widget({
        id: widgetIds.widgetPerson,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: labels.person.label,
        config: {
          source: { providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table, resourceKey: RESOURCES.person },
          presentation: {
            title: labels.person.title,
            controlSize: "small",
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "displayName", fieldKey: "displayName", title: labels.person.columns.displayName, sizing: { mode: "content" } },
              { key: "fullName", fieldKey: "fullName", title: labels.person.columns.name, sizing: { mode: "content" } },
              { key: "companyName", fieldKey: "companyName", title: labels.person.columns.company, sizing: { mode: "content" } },
              { key: "email", fieldKey: "email", title: labels.person.columns.email, renderer: "email", sizing: { mode: "fill" } },
              { key: "phone", fieldKey: "phone", title: labels.person.columns.phone, sizing: { mode: "content" } },
              { key: "mobile", fieldKey: "mobile", title: labels.person.columns.mobile, sizing: { mode: "content" } },
            ],
            emptyState: { title: labels.person.empty },
          },
          features: {
            // The two lists below take this query, so it pages as they do.
            pagination: { enabled: false, pageSize: 25 },
            sorting: { mode: "none" },
            search: { enabled: false },
            tools: { mode: "self-contained", reset: false, reload: true },
            filters: [{
              key: "userId",
              type: "select",
              label: labels.person.picker,
              description: labels.person.pickerHint,
              optionsProvider: {
                providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers,
                loadMode: "server",
                search: { enabled: true, minChars: 2 },
              },
            }],
          },
          signalRoutes: {
            emits: [
              personQueryTo(`${prefix}-person-to-addresses`, addressesAddress),
              personQueryTo(`${prefix}-person-to-threads`, threadsAddress),
            ],
          },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetAddresses,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 1,
        sortOrder: 1,
        label: labels.addresses.label,
        config: {
          source: { providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table, resourceKey: RESOURCES.addresses },
          presentation: {
            title: labels.addresses.title,
            controlSize: "small",
            layout: { mode: "auto", overflowX: "auto" },
            columns: addressColumns,
            emptyState: { title: labels.addresses.empty },
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            search: { enabled: false },
            tools: { mode: "self-contained", reset: false, reload: false },
          },
          signalRoutes: { listens: [queryInput(`${prefix}-addresses-query`, addressesAddress)] },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetThreads,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "table",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 2,
        sortOrder: 2,
        label: labels.threads.label,
        config: {
          // The file's own subject, which Core does not answer: in the reader's language, from this Page.
          source: { providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table, resourceKey: RESOURCES.threads, params: { [PHI_CUSTOMER_FILE_SUBJECT_PARAM]: labels.fileSubject } },
          presentation: {
            title: labels.threads.title,
            controlSize: "small",
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
                  [String(PhisThreadKind.File)]: labels.threads.kinds.file,
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
            emptyState: { title: labels.threads.empty },
          },
          features: {
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
              queryInput(`${prefix}-threads-query`, threadsAddress),
              route(`${prefix}-threads-reload`, "reload", "reload", "activate", threadsAddress),
            ],
          },
        },
      }),
      nodes.widget({
        id: widgetIds.widgetConversation,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        typeKey: "thread-conversation",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX + 3,
        sortOrder: 3,
        label: labels.title,
        config: {
          reply: true,
          signalRoutes: {
            emits: [
              // A conversation opened from `?thread=` reaches the Controller, which knows it is open.
              route(`${prefix}-conversation-opened`, "opened", "opened", "change", controllerAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.threadSelection),
              // Reply: one announcement, two listeners -- the dialog opens on it, the Form reads its row.
              tableAction(`${prefix}-conversation-reply`, "reply", replyOverlayAddress),
              tableAction(`${prefix}-conversation-reply-record`, "reply", replyFormAddress),
            ],
            listens: [
              threadRoute(`${prefix}-conversation-select`, "select", "change", conversationAddress),
              threadRoute(`${prefix}-conversation-reload`, "reload", "reload", conversationAddress),
            ],
          },
        },
      }),
      /*
       * Core's Reply Form, reading its thread from the row the conversation's Reply named, as on the
       * conversations Page. Staff may mark a note internal; in the file every message is internal anyway.
       */
      nodes.widget({
        id: widgetIds.widgetReplyForm,
        parentLayoutNodeId: layoutIds.layoutReply,
        typeKey: "form",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: labels.noteLabel,
        flags: PhiCmsFlags.NoTranslate,
        config: {
          formId: PHI_SHARED_FORM_IDS.threadReply,
          formConfig: { initialValues: { internalAllowed: true } },
          execution: { mode: "handler" },
          source: { providerKey: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table, resourceKey: "inbox" },
          openActionKey: "reply",
          feedback: { mode: "message" },
          signalRoutes: {
            emits: [
              route(`${prefix}-reply-success`, "submitSuccess", "submit", "activate", controllerAddress, "json", PHI_SIGNAL_VALUE_SCHEMAS.formResult),
              route(`${prefix}-reply-success-close`, "submitSuccess", "dialog", "close", replyOverlayAddress),
            ],
            listens: [
              route(`${prefix}-reply-submit`, "submit", "submit", "activate", replyFormAddress),
              tableAction(`${prefix}-reply-record-open`, "recordOpen", replyFormAddress),
            ],
          },
        },
      }),
      ...replyDialog.widgets,
    ],
  };
}
