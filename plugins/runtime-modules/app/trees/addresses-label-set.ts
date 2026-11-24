import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiMessageLabel, definePhiRuntimeModuleLabelSet, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_APP_RUNTIME_MODULE_IDENTITY } from "../ids";

/**
 * What the account's addresses say: the panel, the Table's columns and acts, and the two dialogs that add
 * an address and change one. One set for all of it, because the Forms and the Table name the same parts.
 */
const PHI_APP_ADDRESSES_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_APP_RUNTIME_MODULE_IDENTITY, {
  key: "preset:account-addresses",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    panel_title: "Addresses",
    panel_description: definePhiMessageLabel("Where invoices are made out to and orders are sent on this site."),
    table_label: "addresses",
    column_name: "Name",
    column_address: "Address",
    column_purposes: "Used for",
    purpose_billing: "Billing",
    purpose_shipping: "Shipping",
    purpose_default_billing: "Default billing",
    purpose_default_shipping: "Default shipping",
    empty_title: definePhiMessageLabel("No address yet."),
    empty_text: definePhiMessageLabel("Add one for invoices or deliveries; it is kept for this site only."),
    action_add: "Add address",
    action_edit: "Change",
    action_default_billing: "Use for billing by default",
    action_default_shipping: "Use for shipping by default",
    action_remove: "Remove",
    remove_title: "Remove this address?",
    remove_text: definePhiMessageLabel("It is gone from your account. An order or invoice made out to it keeps it."),
    confirm_ok: "Remove",
    cancel: "Cancel",
    save: "Save",
    add_title: "Add address",
    edit_title: "Change address",
    field_name: "Name",
    field_name_required: "Enter the name the address is made out to.",
    field_company: "Company",
    field_line1: "Street and number",
    field_line1_required: "Enter the street and number.",
    field_line2: "Address line 2",
    field_postal_code: "Postal code",
    field_city: "City",
    field_city_required: "Enter the city.",
    field_region: "Region",
    field_country: "Country",
    field_country_hint: definePhiMessageLabel("The two-letter code, such as CH, DE or US."),
    field_country_invalid: "Enter a two-letter country code.",
    field_billing: "Billing address",
    field_shipping: "Shipping address",
    field_default_billing: "Default for billing",
    field_default_shipping: "Default for shipping",
    success_title: "Address saved",
    success_text: definePhiMessageLabel("Your address has been saved."),
  },
});

export async function getPhiAppAddressesLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_APP_ADDRESSES_LABEL_SET);
  return {
    panel: { title: labels.panel_title, description: labels.panel_description },
    tableLabel: labels.table_label,
    columns: { name: labels.column_name, address: labels.column_address, purposes: labels.column_purposes },
    purposes: {
      billing: labels.purpose_billing,
      shipping: labels.purpose_shipping,
      defaultBilling: labels.purpose_default_billing,
      defaultShipping: labels.purpose_default_shipping,
    },
    empty: { title: labels.empty_title, text: labels.empty_text },
    actions: {
      add: labels.action_add,
      edit: labels.action_edit,
      defaultBilling: labels.action_default_billing,
      defaultShipping: labels.action_default_shipping,
      remove: labels.action_remove,
    },
    remove: { title: labels.remove_title, text: labels.remove_text, ok: labels.confirm_ok },
    cancel: labels.cancel,
    save: labels.save,
    addTitle: labels.add_title,
    editTitle: labels.edit_title,
    form: {
      name: labels.field_name,
      nameRequired: labels.field_name_required,
      company: labels.field_company,
      line1: labels.field_line1,
      line1Required: labels.field_line1_required,
      line2: labels.field_line2,
      postalCode: labels.field_postal_code,
      city: labels.field_city,
      cityRequired: labels.field_city_required,
      region: labels.field_region,
      country: labels.field_country,
      countryHint: labels.field_country_hint,
      countryInvalid: labels.field_country_invalid,
      billing: labels.field_billing,
      shipping: labels.field_shipping,
      defaultBilling: labels.field_default_billing,
      defaultShipping: labels.field_default_shipping,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}
