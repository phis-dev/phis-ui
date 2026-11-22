import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY } from "../ids";

/**
 * What the product directory in the Accounting Area says: its frame, the Table's columns, filters and
 * footer, the terms side by side in the dialog that releases them, and the three acts.
 */
const PHI_ACCOUNTING_PRODUCTS_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY, {
  key: "preset:accounting-products-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Products",
    page_description: definePhiMessageLabel("Every product the Site's Add-ons supply: release their terms, lock and unlock them."),
    widget_label: "products",
    column_title: "Title",
    column_id: "ID",
    column_supplier: "Supplier",
    column_kind: "Kind",
    column_state: "State",
    column_sale: "Sale",
    column_free: "Free",
    column_account: "Account required",
    column_parts: "Bundle parts",
    column_waiting: "Terms waiting",
    state_draft: "Draft",
    state_active: "Active",
    state_withdrawn: "Withdrawn",
    state_locked: "Locked",
    sale_own: "Own",
    sale_referral: "Referral",
    sale_payout: "Payout",
    search_placeholder: "Title or ID",
    filter_supplier: "Supplier",
    filter_supplier_placeholder: "@scope/name",
    filter_state: "State",
    filter_waiting: "Terms waiting",
    footer: "%1 products",
    empty_title: definePhiMessageLabel("No product matches."),
    empty_text: definePhiMessageLabel("The Site's Add-ons register their products here; none does yet, or the filters leave none."),
    action_release: "Release terms",
    action_lock: "Lock",
    action_unlock: "Unlock",
    action_cancel: "Cancel",
    release_description: definePhiMessageLabel(
      "The terms waiting for release take effect now, and the Add-ons that sell it are told.",
    ),
    lock_title: "Lock %1?",
    lock_description: definePhiMessageLabel(
      "Nobody can acquire it, and no entitlement to it counts while it is locked. Its supplier cannot undo it.",
    ),
    unlock_title: "Unlock %1?",
    unlock_description: definePhiMessageLabel(
      "It becomes withdrawn: entitlements count again, nobody acquires it until its supplier makes it active.",
    ),
    terms_title: "Terms",
    terms_title_of: "Terms: %1",
    terms_release: "Release",
    terms_product: "Product",
    terms_sale_in_force: "Sale in force",
    terms_sale_waiting: "Sale waiting for release",
    terms_referral_in_force: "Referral address in force",
    terms_referral_waiting: "Referral address waiting for release",
    terms_free_in_force: "Free in force",
    terms_free_waiting: "Free waiting for release",
    terms_account_in_force: "Account required in force",
    terms_account_waiting: "Account required waiting for release",
    terms_parts_in_force: "Bundle parts in force",
    terms_parts_waiting: "Bundle parts waiting for release",
  },
});

export async function getPhiAccountingProductsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ACCOUNTING_PRODUCTS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    widgetLabel: labels.widget_label,
    columns: {
      title: labels.column_title,
      id: labels.column_id,
      supplier: labels.column_supplier,
      kind: labels.column_kind,
      state: labels.column_state,
      sale: labels.column_sale,
      free: labels.column_free,
      account: labels.column_account,
      parts: labels.column_parts,
      waiting: labels.column_waiting,
    },
    states: {
      draft: labels.state_draft,
      active: labels.state_active,
      withdrawn: labels.state_withdrawn,
      locked: labels.state_locked,
    },
    sales: { own: labels.sale_own, referral: labels.sale_referral, payout: labels.sale_payout },
    search: labels.search_placeholder,
    filters: {
      supplier: labels.filter_supplier,
      supplierPlaceholder: labels.filter_supplier_placeholder,
      state: labels.filter_state,
      waiting: labels.filter_waiting,
    },
    footer: labels.footer,
    empty: { title: labels.empty_title, text: labels.empty_text },
    actions: {
      release: labels.action_release,
      lock: labels.action_lock,
      unlock: labels.action_unlock,
      cancel: labels.action_cancel,
    },
    release: { description: labels.release_description },
    lock: { title: labels.lock_title, description: labels.lock_description },
    unlock: { title: labels.unlock_title, description: labels.unlock_description },
    terms: {
      title: labels.terms_title,
      titleOf: labels.terms_title_of,
      release: labels.terms_release,
      product: labels.terms_product,
      sale: { inForce: labels.terms_sale_in_force, waiting: labels.terms_sale_waiting },
      referral: { inForce: labels.terms_referral_in_force, waiting: labels.terms_referral_waiting },
      free: { inForce: labels.terms_free_in_force, waiting: labels.terms_free_waiting },
      account: { inForce: labels.terms_account_in_force, waiting: labels.terms_account_waiting },
      parts: { inForce: labels.terms_parts_in_force, waiting: labels.terms_parts_waiting },
    },
  };
}
