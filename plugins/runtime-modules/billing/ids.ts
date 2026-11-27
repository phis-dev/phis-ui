import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import { createPhiSharedFormProviderKey } from "../../../components/forms/form-provider-contract";
import { createPhiFormId } from "../../../types/form-id";

export const PHI_BILLING_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/billing` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`), stated beside
 * the id so a Label Set a tree reads does not import the definition that imports the tree.
 */
export const PHI_BILLING_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_BILLING_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

export const PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS = {
  /** Billing documents: the person's own (App) and every one of the Site (Accounting). */
  documents: createPhiSharedRuntimeDataProviderKey("tables", "billing-documents"),
  /** The Site's number series. */
  series: createPhiSharedRuntimeDataProviderKey("tables", "billing-series"),
  /** The installed Add-ons a series may let number from it (their manifest declares `billing.issues`). */
  issuers: createPhiSharedRuntimeDataProviderKey("options", "billing-issuers"),
  /** The number a template would give the next document now, as Core answers it. */
  nextNumber: createPhiSharedRuntimeDataProviderKey("options", "billing-next-number"),
} as const;

/** The resources of the documents Provider: the signed-in person's own, and every one of the Site. */
export const PHI_BILLING_DOCUMENT_RESOURCE_KEYS = {
  own: "own",
  site: "site",
} as const;

export const PHI_BILLING_SERIES_RESOURCE_KEY = "series";

/** The binding params a document Table hands its Provider: words the Provider writes into a row. */
export const PHI_BILLING_DOCUMENT_PARAM_KEYS = {
  /** "For invoice %1", the line under a credit note's or a reminder's description. */
  forInvoiceText: "forInvoiceText",
} as const;

/** The Pages the Module brings, by the keys their nodes' preset ids are derived from. */
export const PHI_BILLING_PAGE_PRESET_KEYS = {
  appDocuments: "app-billing-documents-page",
  accountingDocuments: "accounting-billing-documents-page",
  accountingSeries: "accounting-billing-series-page",
} as const;

export const PHI_BILLING_FORM_IDS = {
  seriesCreate: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "billing/series-create"),
  seriesEdit: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "billing/series-edit"),
  seriesReplace: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "billing/series-replace"),
} as const;

/** The Module's own field type: the next number of a template, a preview Core answers (`forms.ts`). */
export const PHI_BILLING_NEXT_NUMBER_FIELD_PROVIDER_KEY = createPhiSharedFormProviderKey("field", "billing-next-number");
