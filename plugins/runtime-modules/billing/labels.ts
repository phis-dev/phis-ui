import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_BILLING_PAGE_PRESET_KEYS, PHI_BILLING_RUNTIME_MODULE_IDENTITY } from "./ids";

/*
 * The Billing Module's words, in English, its source language: the documents' columns, kinds, states and
 * acts once for both document Pages, each Page's frame, and the number series Page and its Forms.
 */

const PHI_BILLING_DOCUMENTS_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BILLING_RUNTIME_MODULE_IDENTITY, {
  key: "billing:documents",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    column_date: "Date",
    column_kind: "Kind",
    column_number: "Number",
    column_label: "Description",
    column_issuer: "Issuer",
    column_total: "Total",
    column_total_hint: definePhiMessageLabel("Below it, what was paid in another currency where the provider converted it."),
    column_state: "State",
    column_payment: "Payment",
    column_source: "Source",
    column_reference: "Reference",
    column_marks: "Marks",
    kind_invoice: "Invoice",
    kind_credit_note: "Credit note",
    kind_reminder: "Reminder",
    kind_receipt: "Receipt",
    kind_confirmation: "Confirmation",
    status_pending: "Pending",
    status_available: "Available",
    status_voided: "Voided",
    status_failed: "Failed",
    payment_open: "Open",
    payment_partially_paid: "Partially paid",
    payment_paid: "Paid",
    payment_written_off: "Written off",
    issuer_merchant: "Merchant",
    issuer_provider: "Payment provider",
    mark_voided: "Voided",
    mark_credited: "Credited",
    mark_detached: "Detached",
    for_invoice: definePhiMessageLabel("For invoice %1"),
    action_open: "Open",
    action_download: "Download",
    action_view: "Details",
    action_retry: "Retry",
    filter_kind: "Kind",
    filter_year: "Year",
    footer: definePhiMessageLabel("%1 documents on this page"),
  },
});

const PHI_BILLING_APP_DOCUMENTS_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BILLING_RUNTIME_MODULE_IDENTITY, {
  key: `preset:${PHI_BILLING_PAGE_PRESET_KEYS.appDocuments}`,
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Invoices and receipts",
    page_description: definePhiMessageLabel("Your invoices, receipts and other billing documents, from every seller of this site."),
    table_label: "Billing documents",
    empty_title: definePhiMessageLabel("No documents yet."),
    empty_text: definePhiMessageLabel("Invoices and receipts of your purchases appear here."),
  },
});

const PHI_BILLING_ACCOUNTING_DOCUMENTS_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BILLING_RUNTIME_MODULE_IDENTITY, {
  key: `preset:${PHI_BILLING_PAGE_PRESET_KEYS.accountingDocuments}`,
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Documents",
    page_description: definePhiMessageLabel("Every billing document of the site: the payment provider's, the shop's and every issuer's."),
    not_staff: definePhiMessageLabel("Billing documents are for the site roles Admin and Accountant."),
    table_label: "Billing documents of the site",
    search_placeholder: "Search number, reference and description",
    filter_person: "Person",
    filter_person_placeholder: "Name or email",
    filter_issuer_kind: "Issued by",
    filter_issuer: "Issuer",
    filter_source: "Source Add-on",
    filter_period: "Issued",
    filter_period_start: "From",
    filter_period_end: "To",
    filter_status: "State",
    filter_payment: "Payment",
    empty_title: definePhiMessageLabel("No documents."),
    empty_text: definePhiMessageLabel("No document of the site matches, or none was issued yet."),
    retry_title: definePhiMessageLabel("Fetch this document again?"),
    retry_text: definePhiMessageLabel("Fetching it from the payment provider was given up. It is pending again and fetched as at first."),
    retry_ok: "Retry",
    confirm_cancel: "Cancel",
    detail_title: "Document",
    detail_close: "Close",
    detail_file: "File",
    detail_series: "Number series",
    detail_void_reason: "Why voided",
    detail_corrected_by: "Corrected by",
    detail_consumer: "Sale of",
    detail_payment: "Payment",
    detail_subscription: "Subscription",
    detail_seller: "Seller",
    detail_buyer: "Buyer",
    detail_lines: "Lines",
    detail_due: "Due",
    detail_notes: "Notes",
    detail_retain: "Kept until",
    detail_for_invoice: "For invoice",
  },
});

const PHI_BILLING_SERIES_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BILLING_RUNTIME_MODULE_IDENTITY, {
  key: `preset:${PHI_BILLING_PAGE_PRESET_KEYS.accountingSeries}`,
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Number series",
    page_description: definePhiMessageLabel("The series invoices, credit notes and reminders are numbered from, without gaps."),
    not_staff: definePhiMessageLabel("Number series are for the site roles Admin and Accountant."),
    table_label: "Number series",
    footer: definePhiMessageLabel("%1 series"),
    column_key: "Key",
    column_label: "Label",
    column_template: "Template",
    column_reset: "Starts again",
    column_next: "Next number",
    column_kinds: "Kinds",
    column_sources: "Allowed Add-ons",
    column_state: "State",
    reset_none: "Never",
    reset_yearly: "Every year",
    state_open: "Open",
    state_used: "In use",
    state_closed: "Closed",
    kind_invoice: "Invoice",
    kind_credit_note: "Credit note",
    kind_reminder: "Reminder",
    empty_title: definePhiMessageLabel("No number series yet."),
    empty_text: definePhiMessageLabel("Add one before an Add-on issues invoices, credit notes or reminders."),
    action_add: "Add",
    action_edit: "Edit",
    action_replace: "Replace with a new series",
    action_close: "Close",
    close_title: definePhiMessageLabel("Close this series?"),
    close_text: definePhiMessageLabel("It numbers nothing more; its documents stay. Issuing under its key needs a new series."),
    close_ok: "Close series",
    confirm_cancel: "Cancel",
    create_title: "Add a number series",
    edit_title: "Number series",
    replace_title: "Replace with a new series",
    dialog_cancel: "Cancel",
    dialog_save: "Save",
  },
});

const PHI_BILLING_SERIES_FORM_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BILLING_RUNTIME_MODULE_IDENTITY, {
  key: "billing:series-form",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    key: "Key",
    key_hint: definePhiMessageLabel("What an issuing Add-on names: invoice, credit-note, reminder. At most one open series per key."),
    key_required: definePhiMessageLabel("A key is required."),
    key_pattern: definePhiMessageLabel("Lower-case letters, digits and hyphens, starting with a letter or digit."),
    label: "Label",
    label_hint: definePhiMessageLabel("For people: Invoices from 2027."),
    label_required: definePhiMessageLabel("A label is required."),
    kinds: "Kinds",
    kinds_hint: definePhiMessageLabel("The documents numbered from it. Once it has numbered one, kinds can only be added."),
    kinds_required: definePhiMessageLabel("Choose at least one kind."),
    template: "Template",
    template_hint: definePhiMessageLabel(
      "Text and the serial {xxxxx} (as many x as its least digits), with {YYYY}, {YY} and {MM} for the year and month: PHI-{YY}{xxxxx}.",
    ),
    template_fixed_hint: definePhiMessageLabel("A template never changes once it numbers anything: replace the series to number differently."),
    template_required: definePhiMessageLabel("A template is required."),
    reset: "Starts again",
    reset_hint: definePhiMessageLabel("Every year: the serial starts at 1 on 1 January; the template then needs {YYYY} or {YY}."),
    reset_required: definePhiMessageLabel("Choose when the serial starts again."),
    sources: "Allowed Add-ons",
    sources_hint: definePhiMessageLabel("The installed Add-ons that issue documents and may number from this series."),
    next: "Next number",
    next_hint: definePhiMessageLabel("What the next document would be numbered now. Nothing is reserved."),
    kind_invoice: "Invoice",
    kind_credit_note: "Credit note",
    kind_reminder: "Reminder",
    reset_none: "Never",
    reset_yearly: "Every year",
  },
});

export async function getPhiBillingDocumentLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BILLING_DOCUMENTS_LABEL_SET);
  return {
    columns: {
      date: labels.column_date,
      kind: labels.column_kind,
      number: labels.column_number,
      label: labels.column_label,
      issuer: labels.column_issuer,
      total: labels.column_total,
      totalHint: labels.column_total_hint,
      state: labels.column_state,
      payment: labels.column_payment,
      source: labels.column_source,
      reference: labels.column_reference,
      marks: labels.column_marks,
    },
    kinds: {
      invoice: labels.kind_invoice,
      "credit-note": labels.kind_credit_note,
      reminder: labels.kind_reminder,
      receipt: labels.kind_receipt,
      confirmation: labels.kind_confirmation,
    },
    statuses: {
      pending: labels.status_pending,
      available: labels.status_available,
      voided: labels.status_voided,
      failed: labels.status_failed,
    },
    paymentStates: {
      open: labels.payment_open,
      "partially-paid": labels.payment_partially_paid,
      paid: labels.payment_paid,
      "written-off": labels.payment_written_off,
    },
    issuerKinds: { merchant: labels.issuer_merchant, provider: labels.issuer_provider },
    marks: { voided: labels.mark_voided, credited: labels.mark_credited, detached: labels.mark_detached },
    forInvoice: labels.for_invoice,
    actions: {
      open: labels.action_open,
      download: labels.action_download,
      view: labels.action_view,
      retry: labels.action_retry,
    },
    filterKind: labels.filter_kind,
    filterYear: labels.filter_year,
    footer: labels.footer,
  };
}

export async function getPhiBillingAppDocumentsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BILLING_APP_DOCUMENTS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    tableLabel: labels.table_label,
    emptyTitle: labels.empty_title,
    emptyText: labels.empty_text,
  };
}

export async function getPhiBillingAccountingDocumentsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BILLING_ACCOUNTING_DOCUMENTS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    notStaff: labels.not_staff,
    tableLabel: labels.table_label,
    searchPlaceholder: labels.search_placeholder,
    filters: {
      person: labels.filter_person,
      personPlaceholder: labels.filter_person_placeholder,
      issuerKind: labels.filter_issuer_kind,
      issuer: labels.filter_issuer,
      source: labels.filter_source,
      period: labels.filter_period,
      periodStart: labels.filter_period_start,
      periodEnd: labels.filter_period_end,
      status: labels.filter_status,
      payment: labels.filter_payment,
    },
    emptyTitle: labels.empty_title,
    emptyText: labels.empty_text,
    retry: { title: labels.retry_title, text: labels.retry_text, ok: labels.retry_ok },
    confirmCancel: labels.confirm_cancel,
    detail: {
      title: labels.detail_title,
      close: labels.detail_close,
      file: labels.detail_file,
      series: labels.detail_series,
      voidReason: labels.detail_void_reason,
      correctedBy: labels.detail_corrected_by,
      consumer: labels.detail_consumer,
      payment: labels.detail_payment,
      subscription: labels.detail_subscription,
      seller: labels.detail_seller,
      buyer: labels.detail_buyer,
      lines: labels.detail_lines,
      due: labels.detail_due,
      notes: labels.detail_notes,
      retain: labels.detail_retain,
      forInvoice: labels.detail_for_invoice,
    },
  };
}

export async function getPhiBillingSeriesPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BILLING_SERIES_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    notStaff: labels.not_staff,
    tableLabel: labels.table_label,
    footer: labels.footer,
    columns: {
      key: labels.column_key,
      label: labels.column_label,
      template: labels.column_template,
      reset: labels.column_reset,
      next: labels.column_next,
      kinds: labels.column_kinds,
      sources: labels.column_sources,
      state: labels.column_state,
    },
    resets: { none: labels.reset_none, yearly: labels.reset_yearly },
    states: { open: labels.state_open, used: labels.state_used, closed: labels.state_closed },
    kinds: { invoice: labels.kind_invoice, "credit-note": labels.kind_credit_note, reminder: labels.kind_reminder },
    emptyTitle: labels.empty_title,
    emptyText: labels.empty_text,
    actions: {
      add: labels.action_add,
      edit: labels.action_edit,
      replace: labels.action_replace,
      close: labels.action_close,
    },
    close: { title: labels.close_title, text: labels.close_text, ok: labels.close_ok },
    confirmCancel: labels.confirm_cancel,
    dialogs: {
      create: labels.create_title,
      edit: labels.edit_title,
      replace: labels.replace_title,
      cancel: labels.dialog_cancel,
      save: labels.dialog_save,
    },
  };
}

/** The series Forms' words, under the keys their descriptors name (`forms.ts`). */
export async function getPhiBillingSeriesFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_BILLING_SERIES_FORM_LABEL_SET);
  return {
    fields: {
      key: labels.key,
      keyHint: labels.key_hint,
      keyRequired: labels.key_required,
      keyPattern: labels.key_pattern,
      label: labels.label,
      labelHint: labels.label_hint,
      labelRequired: labels.label_required,
      kinds: labels.kinds,
      kindsHint: labels.kinds_hint,
      kindsRequired: labels.kinds_required,
      template: labels.template,
      templateHint: labels.template_hint,
      templateFixedHint: labels.template_fixed_hint,
      templateRequired: labels.template_required,
      reset: labels.reset,
      resetHint: labels.reset_hint,
      resetRequired: labels.reset_required,
      sources: labels.sources,
      sourcesHint: labels.sources_hint,
      next: labels.next,
      nextHint: labels.next_hint,
    },
    kinds: { invoice: labels.kind_invoice, creditNote: labels.kind_credit_note, reminder: labels.kind_reminder },
    resets: { none: labels.reset_none, yearly: labels.reset_yearly },
  };
}
