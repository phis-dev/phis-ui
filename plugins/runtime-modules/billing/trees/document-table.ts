import type { getPhiBillingDocumentLabels } from "../labels";
import { PHI_BILLING_DOCUMENT_PARAM_KEYS } from "../ids";
import type { PhiTableActionDefinition, PhiTableColumnDefinition, PhiTableFooterConfig } from "../../../../types/table-widget";

type Labels = Awaited<ReturnType<typeof getPhiBillingDocumentLabels>>;

/*
 * What both document Tables share -- the App's of the person's own and Accounting's of the whole Site:
 * the columns and their words, the colours of a state, and the two acts that open a document through
 * Core's signed address.
 */

const STATUS_COLORS = { pending: "processing", available: "success", voided: "default", failed: "error" } as const;
const PAYMENT_COLORS = { open: "warning", "partially-paid": "processing", paid: "success", "written-off": "default" } as const;
const MARK_COLORS = { voided: "default", credited: "processing", detached: "warning" } as const;

/** The columns of a document list: date, kind, number, description, issuer, total, state, payment. */
export function buildPhiBillingDocumentColumns(labels: Labels, extra: readonly PhiTableColumnDefinition[] = []): PhiTableColumnDefinition[] {
  return [
    { key: "issuedAt", fieldKey: "issuedAt", title: labels.columns.date, renderer: "datetime", sizing: { mode: "content" } },
    { key: "kind", fieldKey: "kind", title: labels.columns.kind, valueMap: labels.kinds, sizing: { mode: "content" } },
    { key: "number", fieldKey: "number", title: labels.columns.number, renderer: "code", sizing: { mode: "content" } },
    {
      key: "label",
      fieldKey: "label",
      title: labels.columns.label,
      // A credit note or a reminder says which invoice it belongs to, under its own line.
      secondary: { fieldKey: "correctsLabel" },
      sizing: { mode: "fill", minWidth: 200 },
    },
    { key: "issuer", fieldKey: "issuerName", title: labels.columns.issuer, sizing: { mode: "content" } },
    {
      key: "total",
      fieldKey: "total",
      title: labels.columns.total,
      description: labels.columns.totalHint,
      renderer: "money",
      align: "right",
      secondary: { fieldKey: "presentment", renderer: "money" },
      sizing: { mode: "content" },
    },
    {
      key: "status",
      fieldKey: "status",
      title: labels.columns.state,
      renderer: "badge",
      valueMap: labels.statuses,
      tagColorMap: STATUS_COLORS,
      sizing: { mode: "content" },
    },
    {
      key: "paymentState",
      fieldKey: "paymentState",
      title: labels.columns.payment,
      renderer: "badge",
      valueMap: labels.paymentStates,
      tagColorMap: PAYMENT_COLORS,
      sizing: { mode: "content" },
    },
    ...extra,
  ];
}

/** The marks of a document -- voided, credited, detached -- as tags, for staff. */
export function buildPhiBillingDocumentMarksColumn(labels: Labels): PhiTableColumnDefinition {
  return {
    key: "marks",
    fieldKey: "marks",
    title: labels.columns.marks,
    renderer: "tags",
    valueMap: labels.marks,
    tagColorMap: MARK_COLORS,
    sizing: { mode: "content" },
  };
}

/** The line under a document list: how many documents this page of it shows (a list read by cursor counts no whole). */
export function buildPhiBillingDocumentFooter(labels: Labels): PhiTableFooterConfig {
  return { template: labels.footer, values: [{ key: "rows", value: { source: "core", fieldKey: "pageRows" } }] };
}

/** What the Provider is told by the Page: the words it writes into a row (`services/documents-table.tsx`). */
export function buildPhiBillingDocumentParams(labels: Labels) {
  return { [PHI_BILLING_DOCUMENT_PARAM_KEYS.forInvoiceText]: labels.forInvoice };
}

/** Open (in a tab of its own) and Download, each through a signed address Core gives for the one document. */
export function buildPhiBillingDocumentOpenActions(labels: Labels): PhiTableActionDefinition[] {
  return [
    { key: "open", label: labels.actions.open, icon: "eye", display: "icon", execution: "provider" },
    { key: "download", label: labels.actions.download, icon: "download", display: "icon", execution: "provider" },
  ];
}

export const PHI_BILLING_DOCUMENT_COLORS = { status: STATUS_COLORS, payment: PAYMENT_COLORS, marks: MARK_COLORS } as const;
