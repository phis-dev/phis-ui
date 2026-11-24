import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY } from "../ids";

/**
 * What the customer file in the Accounting Area says: the member picker, the person's details, their
 * addresses, the file and the conversations they are in, and the Reply dialog. The conversation words
 * are its own rather than the conversations Page's, since a Module does not read another's Label Set.
 */
const PHI_CUSTOMER_FILE_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY, {
  key: "preset:accounting-customer-file-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Customer file",
    description: definePhiMessageLabel("One member of the site: how to reach them, where they are, their file and their conversations."),
    not_staff: definePhiMessageLabel("The customer file is for accounting."),
    person_title: "Customer",
    person_label: "customer",
    person_picker: "Member",
    person_picker_hint: definePhiMessageLabel("Search by name, e-mail address or telephone number."),
    person_empty: definePhiMessageLabel("Choose a member to open their file."),
    own_file: definePhiMessageLabel("This is your own record; it is not shown here."),
    column_display_name: "Shown as",
    column_name: "Name",
    column_company: "Company",
    column_email: "E-mail",
    column_phone: "Business phone",
    column_mobile: "Mobile",
    addresses_title: "Addresses",
    addresses_label: "customer addresses",
    addresses_empty: definePhiMessageLabel("No address on file."),
    column_address_name: "Name",
    column_address: "Address",
    column_purposes: "Used for",
    purpose_billing: "Billing",
    purpose_shipping: "Shipping",
    purpose_default_billing: "Default billing",
    purpose_default_shipping: "Default shipping",
    threads_title: "File and conversations",
    threads_label: "customer threads",
    threads_empty: definePhiMessageLabel("Choose a member to see their file and the conversations they are in."),
    file_subject: "Customer file",
    kind_file: "File",
    kind_direct: "Direct",
    kind_group: "Group",
    kind_cross_group: "Between groups",
    kind_support: "Support",
    column_subject: "Subject",
    column_kind: "Kind",
    column_state: "State",
    column_activity: "Last activity",
    state_unread: "New",
    state_open: { text: "Open", ctx: "Web UI label, state" },
    state_archived: "Archived",
    state_locked: "Locked",
    note_label: "Internal note",
    reply_send_label: "Send",
  },
});

export async function getPhiAccountingCustomerFilePageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_CUSTOMER_FILE_PAGE_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    notStaff: labels.not_staff,
    person: {
      title: labels.person_title,
      label: labels.person_label,
      picker: labels.person_picker,
      pickerHint: labels.person_picker_hint,
      empty: labels.person_empty,
      columns: {
        displayName: labels.column_display_name,
        name: labels.column_name,
        company: labels.column_company,
        email: labels.column_email,
        phone: labels.column_phone,
        mobile: labels.column_mobile,
      },
    },
    addresses: {
      title: labels.addresses_title,
      label: labels.addresses_label,
      empty: labels.addresses_empty,
      columns: { name: labels.column_address_name, address: labels.column_address, purposes: labels.column_purposes },
      purposes: {
        billing: labels.purpose_billing,
        shipping: labels.purpose_shipping,
        defaultBilling: labels.purpose_default_billing,
        defaultShipping: labels.purpose_default_shipping,
      },
    },
    threads: {
      title: labels.threads_title,
      label: labels.threads_label,
      empty: labels.threads_empty,
      columns: {
        subject: labels.column_subject,
        kind: labels.column_kind,
        state: labels.column_state,
        activity: labels.column_activity,
      },
      kinds: {
        file: labels.kind_file,
        direct: labels.kind_direct,
        group: labels.kind_group,
        crossGroup: labels.kind_cross_group,
        support: labels.kind_support,
      },
      states: {
        unread: labels.state_unread,
        open: labels.state_open,
        archived: labels.state_archived,
        locked: labels.state_locked,
      },
    },
    fileSubject: labels.file_subject,
    ownFile: labels.own_file,
    noteLabel: labels.note_label,
    replySendLabel: labels.reply_send_label,
  };
}
