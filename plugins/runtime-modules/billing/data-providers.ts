import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import type { PhiTableProviderFieldDefinition } from "../../../types/table-widget";
import {
  PHI_BILLING_DOCUMENT_RESOURCE_KEYS,
  PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_BILLING_RUNTIME_MODULE_ID,
  PHI_BILLING_SERIES_RESOURCE_KEY,
} from "./ids";

const KIND_OPTIONS = [
  { value: "invoice", label: "Invoice" },
  { value: "credit-note", label: "Credit note" },
  { value: "reminder", label: "Reminder" },
  { value: "receipt", label: "Receipt" },
  { value: "confirmation", label: "Confirmation" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "available", label: "Available" },
  { value: "voided", label: "Voided" },
  { value: "failed", label: "Failed" },
];

const PAYMENT_STATE_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "partially-paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "written-off", label: "Written off" },
];

/** A document's list fields as a row speaks them (`services/documents-table.tsx`), for both resources. */
const DOCUMENT_FIELDS: PhiTableProviderFieldDefinition[] = [
  { key: "id", title: "ID", type: "string", required: true },
  { key: "kind", title: "Kind", type: "enum", options: KIND_OPTIONS },
  { key: "number", title: "Number", type: "string" },
  { key: "label", title: "Label", type: "string" },
  { key: "issuerName", title: "Issuer", type: "string" },
  { key: "issuerKind", title: "Issued by", type: "enum", options: [{ value: "merchant", label: "Merchant" }, { value: "provider", label: "Provider" }] },
  { key: "sourceAddonId", title: "Source", type: "string" },
  { key: "consumerAddonId", title: "Sale of", type: "string" },
  { key: "reference", title: "Reference", type: "string" },
  { key: "issuedAt", title: "Issued", type: "datetime" },
  // `PhisPaymentMoney`; the converted amount where the Provider converted.
  { key: "total", title: "Total", type: "json" },
  { key: "presentment", title: "Paid as", type: "json" },
  { key: "status", title: "State", type: "enum", options: STATUS_OPTIONS },
  { key: "paymentState", title: "Payment", type: "enum", options: PAYMENT_STATE_OPTIONS },
  // `PhisBillingDocumentFlag` as one tag each: `voided`, `credited`, `detached`.
  { key: "marks", title: "Marks", type: "json" },
  // The number of the invoice a credit note or reminder refers to, where the listing has read it.
  { key: "correctsNumber", title: "For invoice", type: "string" },
  // The same in the Page's words ("For invoice PHI-2600042"), from the binding's `forInvoiceText`.
  { key: "correctsLabel", title: "For invoice (line)", type: "string" },
  { key: "retainUntil", title: "Kept until", type: "datetime" },
  // Open and Download need a document that is there to open.
  { key: "available", title: "Available", type: "boolean" },
];

/** What only the staff record reads (`GET /api/site/accounting/billing-documents/:id`). */
const DOCUMENT_DETAIL_FIELDS: PhiTableProviderFieldDefinition[] = [
  { key: "fileLabel", title: "File", type: "string" },
  { key: "seriesLabel", title: "Number series", type: "string" },
  { key: "voidReason", title: "Why voided", type: "string" },
  { key: "correctionNumbers", title: "Corrected by", type: "json" },
  { key: "paymentId", title: "Payment", type: "string" },
  { key: "subscriptionId", title: "Subscription", type: "string" },
  { key: "seller", title: "Seller", type: "string" },
  { key: "buyer", title: "Buyer", type: "string" },
  { key: "lines", title: "Lines", type: "string" },
  { key: "dueAt", title: "Due", type: "datetime" },
  { key: "notes", title: "Notes", type: "string" },
  // A Provider's document whose fetching was given up: Retry starts it again.
  { key: "retryable", title: "Can be fetched again", type: "boolean" },
];

const OPEN_ACTIONS = [
  {
    key: "open",
    title: "Open",
    scope: "row" as const,
    intent: "read" as const,
    disabledWhen: { source: "row" as const, valuePath: "available", operator: "falsy" as const },
  },
  {
    key: "download",
    title: "Download",
    scope: "row" as const,
    intent: "read" as const,
    disabledWhen: { source: "row" as const, valuePath: "available", operator: "falsy" as const },
  },
];

/**
 * Billing documents and number series over Core's routes (phis-server docs/API.md, `billing:v1`).
 *
 * `own` is the signed-in person's own documents (`GET /api/site/account/billing-documents`), every issuer,
 * newest first, a page at a time by cursor; `site` every document of the Site for Admin and Accountant
 * (`GET /api/site/accounting/billing-documents`), with the read-only record a detail dialog shows and
 * Retry for a Provider's document whose fetching was given up. Open and Download ask Core for a signed
 * address of the one document and go there; nothing of the file passes through the Page.
 *
 * `series` is the Site's number series (`/api/site/accounting/billing-series`), each with the number the
 * next document would get; its Forms add, change and replace one (`forms.ts`), and Close is its act.
 * `issuers` are the Add-ons a series may let number from it, `nextNumber` the preview Core answers for a
 * template and reset.
 */
export const PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.documents,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Billing documents",
    description: "Invoices, receipts and the other billing documents of every issuer.",
    resources: [
      {
        resourceKey: PHI_BILLING_DOCUMENT_RESOURCE_KEYS.own,
        title: "My billing documents",
        rowIdentityPath: "id",
        fields: DOCUMENT_FIELDS,
        query: {
          search: false,
          filterFields: ["kinds", "year"],
          sorting: "none",
          pagination: "cursor",
        },
        actions: OPEN_ACTIONS,
      },
      {
        resourceKey: PHI_BILLING_DOCUMENT_RESOURCE_KEYS.site,
        title: "Billing documents of the Site",
        rowIdentityPath: "id",
        recordRead: true,
        fields: [...DOCUMENT_FIELDS, ...DOCUMENT_DETAIL_FIELDS],
        query: {
          search: true,
          filterFields: ["userId", "issuerKind", "issuer", "kinds", "source", "status", "paymentState", "from", "to"],
          sorting: "none",
          pagination: "cursor",
        },
        actions: [
          ...OPEN_ACTIONS,
          {
            key: "retry",
            title: "Retry",
            scope: "row",
            intent: "write",
            confirmation: "required",
            visibleWhen: { source: "row", valuePath: "retryable", operator: "truthy" },
          },
        ],
      },
    ],
  },
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.series,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Number series",
    description: "The number series the Site's issued documents are numbered from.",
    resources: [
      {
        resourceKey: PHI_BILLING_SERIES_RESOURCE_KEY,
        title: "Number series",
        rowIdentityPath: "id",
        recordRead: true,
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          { key: "key", title: "Key", type: "string" },
          { key: "label", title: "Label", type: "string" },
          { key: "template", title: "Template", type: "string" },
          { key: "reset", title: "Reset", type: "enum", options: [{ value: "none", label: "Never" }, { value: "yearly", label: "Every year" }] },
          { key: "next", title: "Next number", type: "string" },
          { key: "kinds", title: "Kinds", type: "json" },
          { key: "sources", title: "Allowed Add-ons", type: "json" },
          { key: "state", title: "State", type: "enum", options: [{ value: "open", label: "Open" }, { value: "used", label: "In use" }, { value: "closed", label: "Closed" }] },
          // `PhisBillingNumberSeriesFlag` as the yes/no a condition reads.
          { key: "used", title: "Has numbered a document", type: "boolean" },
          { key: "closed", title: "Closed", type: "boolean" },
          { key: "createdAt", title: "Created", type: "datetime" },
          { key: "closedAt", title: "Closed at", type: "datetime" },
        ],
        query: {
          search: false,
          filterFields: [],
          sorting: "none",
          pagination: "none",
        },
        actions: [
          {
            key: "close",
            title: "Close",
            scope: "row",
            intent: "destructive",
            confirmation: "required",
            disabledWhen: { source: "row", valuePath: "closed", operator: "truthy" },
          },
        ],
      },
    ],
  },
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.issuers,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Issuing Add-ons",
    description: "The installed Add-ons that issue billing documents, for a number series' allowed Add-ons.",
  },
  {
    key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.nextNumber,
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Next number",
    description: "The number a template would give the next document now, as Core answers it.",
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
