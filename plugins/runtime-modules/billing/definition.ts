import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_BILLING_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_BILLING_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS, PHI_BILLING_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./form-providers";

/**
 * The Site's billing documents and number series (phis-server `billing:v1`, owner, 2026-11-27): the Core
 * module "Billing".
 *
 * - App, `Invoices and receipts`: the signed-in person's own documents of every issuer -- the payment
 *   Provider's archived ones, the Shop's confirmations, an invoicing Add-on's invoices -- opened and
 *   downloaded through Core's signed file address.
 * - Accounting, `Documents`: every document of the Site, for the Site roles Admin and Accountant, with a
 *   read-only detail and Retry for a Provider's document whose fetching was given up.
 * - Accounting, `Number series`: the series issued documents are numbered from, defined by Admin and
 *   Accountant; a template that has numbered anything is replaced by a new series, never changed.
 *
 * A Core module and not an Add-on's pages, because the documents come from several issuers and no one of
 * them owns the list. Switched per Area like the CDN Module: off, its pages are gone. Off by default and in
 * no Area's default list: a Site switches it on where it takes payments.
 */
export const PHI_BILLING_RUNTIME_MODULE_DEFINITION = {
  ...PHI_BILLING_RUNTIME_MODULE_IDENTITY,
  kind: "module",
  eligibleAreas: ["app", "accounting"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Billing",
  description: "Invoices, receipts and the other billing documents of every issuer, and the number series they are numbered from.",
  category: "commerce",
  icon: "antd:file-text",
  dataProviders: PHI_BILLING_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
  formProviders: {
    fieldTypes: PHI_BILLING_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
    handlers: PHI_BILLING_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
} satisfies PhiRuntimeModuleDefinition;
