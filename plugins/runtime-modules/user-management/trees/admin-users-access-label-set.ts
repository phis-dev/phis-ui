import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiMessageLabel, definePhiRuntimeModuleLabelSet, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_IDENTITY } from "../ids";

/**
 * What Admin -> Settings -> Customer data says: which Add-ons read people with nobody acting and what the
 * Site granted them, how long the access log is kept, and the log.
 */
const PHI_ADMIN_USERS_ACCESS_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_USER_MANAGEMENT_RUNTIME_MODULE_IDENTITY, {
  key: "preset:admin-users-access-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Customer data",
    page_description: definePhiMessageLabel("Which Add-ons read customer data in the background, and every time anybody's was read."),
    panel_background: "Background access",
    panel_background_description: definePhiMessageLabel(
      "An Add-on reads people with nobody acting -- in a job or an event -- only the fields granted here, and only while its manifest still asks for them.",
    ),
    panel_retention: "Retention",
    panel_retention_description: definePhiMessageLabel("How long the access log keeps an entry before it is forgotten."),
    panel_log: "Access log",
    panel_log_description: definePhiMessageLabel("Every answer that carried personal data: who asked, through which Add-on, and what it carried."),
    addons_label: "Add-ons reading people",
    retention_label: "access log retention",
    log_label: "access log",
    column_addon: "Add-on",
    column_fields: "Reads",
    column_background: "Asks in the background",
    column_granted: "Granted",
    column_awaiting: "Awaiting",
    column_granted_at: "Granted on",
    retention_days: "Kept for",
    days_unit: "days",
    retention_days_required: definePhiMessageLabel("Enter how many days the log keeps an entry."),
    retention_days_invalid: definePhiMessageLabel("A whole number of days from 1 to 3650."),
    retention_save: "Save",
    column_at: "When",
    column_actor: "Acting",
    column_road: "Road",
    column_operation: "Operation",
    column_subjects: "People",
    column_log_fields: "Fields",
    field_name: "Name",
    field_email: "E-mail",
    field_phone: "Telephone",
    field_address: "Addresses",
    road_staff: "Staff",
    road_self: "Self",
    road_background: "Background",
    road_checkout: "Checkout",
    operation_describe: "Described",
    operation_addresses: "Addresses read",
    operation_create_address: "Address written",
    operation_file_of: "File opened",
    operation_customer_file: "Customer file",
    nobody: "Nobody",
    action_grant: "Grant what is asked",
    action_revoke: "Withdraw",
    grant_title: "Grant %1 background access?",
    grant_text: definePhiMessageLabel("It reads the fields it asks for with nobody acting, until the grant is withdrawn."),
    revoke_title: "Withdraw the grant of %1?",
    revoke_text: definePhiMessageLabel("It reads nobody in the background from now on; what it reads for somebody acting is unchanged."),
    confirm_grant: "Grant",
    confirm_revoke: "Withdraw",
    cancel: "Cancel",
    addons_empty: definePhiMessageLabel("No installed Add-on reads people."),
    log_empty: definePhiMessageLabel("Nothing was read, or the filters leave nothing."),
    addons_footer: "%1 Add-ons",
    // The log pages without a count: what a page holds, and which page it is.
    log_footer: "%1 entries on page %2",
    filter_subject: "Person",
    filter_subject_placeholder: "Subject",
    filter_addon: "Add-on",
    filter_addon_placeholder: "@scope/name",
  },
});

export async function getPhiAdminUsersAccessLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_USERS_ACCESS_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    panels: {
      background: { title: labels.panel_background, description: labels.panel_background_description },
      retention: { title: labels.panel_retention, description: labels.panel_retention_description },
      log: { title: labels.panel_log, description: labels.panel_log_description },
    },
    widgets: { addons: labels.addons_label, retention: labels.retention_label, log: labels.log_label },
    columns: {
      addon: labels.column_addon,
      fields: labels.column_fields,
      background: labels.column_background,
      granted: labels.column_granted,
      awaiting: labels.column_awaiting,
      grantedAt: labels.column_granted_at,
      at: labels.column_at,
      actor: labels.column_actor,
      road: labels.column_road,
      operation: labels.column_operation,
      subjects: labels.column_subjects,
      logFields: labels.column_log_fields,
    },
    // The retention Form's labels, under the keys its descriptor names.
    retention: {
      days: labels.retention_days,
      daysUnit: labels.days_unit,
      daysRequired: labels.retention_days_required,
      daysInvalid: labels.retention_days_invalid,
      save: labels.retention_save,
    },
    fields: { name: labels.field_name, email: labels.field_email, phone: labels.field_phone, address: labels.field_address },
    roads: { staff: labels.road_staff, self: labels.road_self, background: labels.road_background, checkout: labels.road_checkout },
    operations: {
      describe: labels.operation_describe,
      addresses: labels.operation_addresses,
      createAddress: labels.operation_create_address,
      fileOf: labels.operation_file_of,
      customerFile: labels.operation_customer_file,
    },
    nobody: labels.nobody,
    actions: { grant: labels.action_grant, revoke: labels.action_revoke },
    grant: { title: labels.grant_title, text: labels.grant_text, ok: labels.confirm_grant },
    revoke: { title: labels.revoke_title, text: labels.revoke_text, ok: labels.confirm_revoke },
    cancel: labels.cancel,
    empty: { addons: labels.addons_empty, log: labels.log_empty },
    footers: { addons: labels.addons_footer, log: labels.log_footer },
    filters: {
      subject: labels.filter_subject,
      subjectPlaceholder: labels.filter_subject_placeholder,
      addon: labels.filter_addon,
      addonPlaceholder: labels.filter_addon_placeholder,
    },
  };
}
