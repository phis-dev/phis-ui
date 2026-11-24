import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_THREADS_RUNTIME_MODULE_ID,
} from "./ids";
import { PhisThreadKind, PhisThreadStatus } from "../../../constants/threads";
import { PHI_CUSTOMER_FILE_RESOURCE_KEYS } from "../../../constants/customer-file";

/** Who this viewer may write to, for this Module's own Form that opens a conversation. */
export const PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.candidates,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "People you can write to",
    description: "Whoever shares a group with this viewer, for naming them in a new conversation.",
  },
  /*
   * Staff's customer file on one member of the Site (`GET /api/site/members/{userId}/file`, for the
   * holders of `accounting` or `support`): the person as the staff road of `users:v1` answers them, their
   * current addresses where the actor may read them, and the threads -- the person's file first, then
   * every conversation they take part in that the actor sees. Three resources because a Table lists one
   * kind of row; each reads the same route for the member its `userId` filter names, and none reads
   * anything without one. Core writes every read to the Site's access log.
   */
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFile,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Customer file",
    description: "One member as staff may read them: contact details, addresses, their file and their conversations.",
    resources: [
      {
        resourceKey: PHI_CUSTOMER_FILE_RESOURCE_KEYS.person,
        title: "Person",
        rowIdentityPath: "userId",
        fields: [
          { key: "userId", title: "User", type: "number", required: true },
          { key: "displayName", title: "Shown as", type: "string" },
          { key: "fullName", title: "Name", type: "string" },
          { key: "companyName", title: "Company", type: "string" },
          { key: "email", title: "E-mail", type: "string" },
          { key: "phone", title: "Business phone", type: "string" },
          { key: "mobile", title: "Mobile", type: "string" },
        ],
        // The member's number, for the line under the person: the one Core, the access log and support name.
        summaryFields: [{ key: "userId", title: "Member number", type: "number" }],
        query: { search: false, filterFields: ["userId"], sorting: "none", pagination: "none" },
      },
      {
        resourceKey: PHI_CUSTOMER_FILE_RESOURCE_KEYS.addresses,
        title: "Addresses",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "number", required: true },
          { key: "name", title: "Name", type: "string" },
          { key: "lines", title: "Address", type: "string" },
          {
            key: "purposes",
            title: "Purposes",
            type: "enum[]",
            options: ["billing", "shipping", "defaultBilling", "defaultShipping"].map((value) => ({ value, label: value })),
          },
          { key: "createdAt", title: "Added", type: "datetime" },
        ],
        query: { search: false, filterFields: ["userId"], sorting: "none", pagination: "none" },
      },
      {
        resourceKey: PHI_CUSTOMER_FILE_RESOURCE_KEYS.threads,
        title: "Conversations",
        rowIdentityPath: "id",
        // Choosing one opens it in the conversation beside the list, as the inbox does.
        rowActivation: true,
        fields: [
          { key: "id", title: "ID", type: "number", required: true },
          { key: "subject", title: "Subject", type: "string" },
          { key: "kind", title: "Kind", type: "enum", options: [
            { value: String(PhisThreadKind.Direct), label: "Direct" },
            { value: String(PhisThreadKind.Group), label: "Group" },
            { value: String(PhisThreadKind.CrossGroup), label: "Between groups" },
            { value: String(PhisThreadKind.Support), label: "Support" },
            { value: String(PhisThreadKind.File), label: "File" },
          ] },
          { key: "status", title: "Status", type: "enum", options: [
            { value: String(PhisThreadStatus.Open), label: "Open" },
            { value: String(PhisThreadStatus.Archived), label: "Archived" },
          ] },
          { key: "state", title: "State", type: "enum", options: [
            { value: "unread", label: "New" },
            { value: "open", label: "Open" },
            { value: "archived", label: "Archived" },
            { value: "locked", label: "Locked" },
          ] },
          { key: "latestMessageAt", title: "Last activity", type: "datetime" },
        ],
        // Paged by Core without a count, so the list turns back and forth rather than to a page number.
        query: { search: false, filterFields: ["userId"], sorting: "none", pagination: "offset", total: false },
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
