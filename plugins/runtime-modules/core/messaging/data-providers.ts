import type { PhiRuntimeModuleDataProviderDescriptor } from "../../contracts";
import { PhisThreadKind, PhisThreadStatus } from "../../../../constants/threads";
import { PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../constants/thread-library-provider-keys";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../ids";

/**
 * The conversations a viewer is in, as a Table rather than as a Widget or a Collection of its own.
 *
 * Core's, like the conversation and its Reply: every Module that runs a kind of conversation lists it
 * through this Provider, pinning `kind` with the Table's `fixedFilters` -- Support its requests, the
 * conversations Module everything a person is in, an add-on its own.
 *
 * A listing that had been its own Widget would have reimplemented paging, filters, a toolbar, an empty
 * state and a skeleton, and would still have been the one surface nobody else could replace. A
 * Collection got rid of that but put a component back in its place: a row was drawn by a renderer this
 * Module shipped, so every question about it -- which columns, in what order, how wide, sorted how --
 * was answered in code a Site could only replace wholesale. A Table answers all of them in
 * configuration, and the Site that wants the other answer gives it in the Builder.
 *
 * What is lost with the renderer is nothing the rows needed: a conversation is a subject, a kind, a
 * state and a time, which is a row of cells and was drawn as one even when it was a card.
 *
 * `search` is false because the Core route has no text parameter, not because a listing would not want
 * one. Saying so here is what keeps a search box from appearing over a query that cannot answer it, and
 * `sorting` is "none" for the same reason: the route answers by last activity and offers no other order.
 */
export const PHI_CORE_MESSAGING_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Conversations",
    description: "The conversations a viewer may see, newest activity first.",
    resources: [
      {
        resourceKey: "inbox",
        title: "Inbox",
        description: "Every conversation this viewer is in, whichever kind it is.",
        rowIdentityPath: "id",
        // A row is a conversation, and opening it is the whole point of the page.
        rowActivation: true,
        /*
         * And one conversation is what a Reply opens on: the Reply Form reads its thread from the row the
         * conversation's action names, so nothing carries it into a hidden field beside the Form.
         */
        recordRead: true,
        // Unread among everything the listing matches, not only the page shown: what a footer says.
        summaryFields: [{ key: "unread", title: "Unread", type: "number" }],
        /*
         * `state` and `archived` are not on the Core row; the Provider computes both.
         *
         * A badge renders a name and not a flag, and a condition reads a value and not an arithmetic
         * expression -- so the two things a surface actually asks of the status arrive as a name and as
         * a yes. The status itself stays, because a filter is written against what the route takes.
         */
        fields: [
          { key: "id", title: "ID", type: "number", required: true },
          { key: "subject", title: "Subject", type: "string" },
          { key: "kind", title: "Kind", type: "enum", options: [
            { value: String(PhisThreadKind.Direct), label: "Direct" },
            { value: String(PhisThreadKind.Group), label: "Group" },
            { value: String(PhisThreadKind.CrossGroup), label: "Between groups" },
            { value: String(PhisThreadKind.Support), label: "Support" },
          ] },
          { key: "status", title: "Status", type: "enum", options: [
            { value: String(PhisThreadStatus.Open), label: "Open" },
            { value: String(PhisThreadStatus.Archived), label: "Archived" },
          ] },
          { key: "state", title: "State", type: "enum", options: [
            { value: "unread", label: "New" },
            { value: "open", label: "Open" },
            { value: "archived", label: "Archived" },
          ] },
          { key: "archived", title: "Archived", type: "boolean" },
          { key: "unread", title: "Unread", type: "boolean" },
          { key: "latestMessageAt", title: "Last activity", type: "datetime" },
          { key: "updatedAt", title: "Changed", type: "datetime" },
          { key: "createdAt", title: "Started", type: "datetime" },
        ],
        query: {
          search: false,
          sorting: "none",
          pagination: "offset",
          /*
           * The three the Core route takes, and no fourth.
           *
           * `kind` is what a Site pins to make one listing: a Support page filters to Support
           * conversations without Support having to bring a listing of its own.
           */
          filterFields: ["kind", "status", "unreadOnly"],
        },
        /*
         * Archiving is not deleting, and reopening is why it need not be.
         *
         * One row carries the status, so archiving closes the conversation for everyone in it rather
         * than hiding it from one reader -- which is why it asks first and why the way back asks
         * nothing: the consequence reaches other people, and undoing it reaches them again.
         */
        actions: [
          {
            key: "archive",
            title: "Archive",
            scope: "row",
            intent: "write",
            confirmation: "required",
            visibleWhen: { source: "row", valuePath: "archived", operator: "falsy" },
          },
          {
            key: "reopen",
            title: "Reopen",
            scope: "row",
            intent: "write",
            visibleWhen: { source: "row", valuePath: "archived", operator: "truthy" },
          },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
