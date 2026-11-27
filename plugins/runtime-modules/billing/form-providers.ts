import { createPhiSharedFormProviderKey } from "../../../components/forms/form-provider-contract";
import type { PhiFormFieldTypeProviderDescriptor, PhiFormHandlerProviderDescriptor } from "../../../types";
import { PHI_BILLING_NEXT_NUMBER_FIELD_PROVIDER_KEY, PHI_BILLING_RUNTIME_MODULE_ID } from "./ids";

/**
 * The Module's field type: the number a series' template would give the next document now, read-only.
 * Its options are what the `nextNumber` Options Provider answers for the Form's template and reset, Core's
 * preview (`POST /api/site/accounting/billing-series/preview`) -- one option, the number, or the rule the
 * template breaks -- and the field draws that one option. It holds nothing and submits nothing: the number
 * is never computed in the browser, and nothing is reserved.
 */
export const PHI_BILLING_NEXT_NUMBER_FORM_PROVIDER_DESCRIPTOR = {
  key: PHI_BILLING_NEXT_NUMBER_FIELD_PROVIDER_KEY,
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  title: "Next number",
  description: "The number a series' template would give the next document now, as Core answers it.",
  valueType: "string",
  presentation: "control",
} as const satisfies PhiFormFieldTypeProviderDescriptor;

export const PHI_BILLING_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS = [
  PHI_BILLING_NEXT_NUMBER_FORM_PROVIDER_DESCRIPTOR,
] as const satisfies readonly PhiFormFieldTypeProviderDescriptor[];

export const PHI_BILLING_FORM_HANDLER_KEYS = {
  seriesCreate: "site.billing.series-create",
  seriesEdit: "site.billing.series-edit",
  seriesReplace: "site.billing.series-replace",
} as const;

/*
 * Relayed to Core's Accounting routes with the session: who may define series -- the Site roles Admin and
 * Accountant, never a Maintainer -- and what a series may become is Core's to settle there.
 */
const relay = {
  phase: "submit",
  category: "site",
  transport: "relay",
  endpointKey: null,
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} as const;

export const PHI_BILLING_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  {
    ...relay,
    key: createPhiSharedFormProviderKey("handler", "billing-series-create"),
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    title: "Add a number series",
    handlerKey: PHI_BILLING_FORM_HANDLER_KEYS.seriesCreate,
    method: "POST",
    upstreamPath: "/api/site/accounting/billing-series",
  },
  {
    ...relay,
    key: createPhiSharedFormProviderKey("handler", "billing-series-edit"),
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    title: "Change a number series' label, kinds and Add-ons",
    handlerKey: PHI_BILLING_FORM_HANDLER_KEYS.seriesEdit,
    method: "PATCH",
    upstreamPath: "/api/site/accounting/billing-series/{id}",
  },
  {
    ...relay,
    key: createPhiSharedFormProviderKey("handler", "billing-series-replace"),
    ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
    title: "Replace a number series with a new one",
    handlerKey: PHI_BILLING_FORM_HANDLER_KEYS.seriesReplace,
    method: "POST",
    upstreamPath: "/api/site/accounting/billing-series",
  },
] satisfies readonly PhiFormHandlerProviderDescriptor[];
