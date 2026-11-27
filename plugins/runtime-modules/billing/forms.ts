import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import type { PhiFormDescriptor, PhiFormFieldDescriptor } from "../../../types";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { phiFormLabel as label, phiFormRequired as required } from "../../../components/forms/form-descriptor-text";
import {
  PHI_BILLING_FORM_IDS,
  PHI_BILLING_NEXT_NUMBER_FIELD_PROVIDER_KEY,
  PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_BILLING_RUNTIME_MODULE_ID,
} from "./ids";
import { PHI_BILLING_FORM_HANDLER_KEYS } from "./form-providers";

const LABEL_SET_KEY = "@phis/ui/modules/billing/labels/series-form" as const;

/** Core's rule for a series key (phis-server `src/lib/billing/series.ts`), said here so the field answers first. */
const SERIES_KEY_PATTERN = "^[a-z0-9][a-z0-9-]{0,63}$";

/** Shown and sent as it stands; what may change of a series is Core's to say, and these never do here. */
const FIXED = { disabled: true } as const;

const keyField = (fixed: boolean): PhiFormFieldDescriptor => ({
  key: "key",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
  label: label("fields.key", "Key"),
  description: label("fields.keyHint", "What an issuing Add-on names: invoice, credit-note, reminder. At most one open series per key."),
  ...(fixed ? { config: FIXED } : {
    validation: [
      ...required("fields.keyRequired", "A key is required."),
      {
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern,
        message: label("fields.keyPattern", "Lower-case letters, digits and hyphens, starting with a letter or digit."),
        config: { source: SERIES_KEY_PATTERN },
      },
    ],
  }),
});

const LABEL_FIELD: PhiFormFieldDescriptor = {
  key: "label",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
  label: label("fields.label", "Label"),
  description: label("fields.labelHint", "For people: Invoices from 2027."),
  validation: required("fields.labelRequired", "A label is required."),
};

const KINDS_FIELD: PhiFormFieldDescriptor = {
  key: "kinds",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
  label: label("fields.kinds", "Kinds"),
  description: label("fields.kindsHint", "The documents numbered from it. Once it has numbered one, kinds can only be added."),
  options: [
    { value: "invoice", label: label("kinds.invoice", "Invoice") },
    { value: "credit-note", label: label("kinds.creditNote", "Credit note") },
    { value: "reminder", label: label("kinds.reminder", "Reminder") },
  ],
  validation: required("fields.kindsRequired", "Choose at least one kind."),
};

const templateField = (fixed: boolean): PhiFormFieldDescriptor => ({
  key: "template",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
  label: label("fields.template", "Template"),
  description: fixed
    ? label("fields.templateFixedHint", "A template never changes once it numbers anything: replace the series to number differently.")
    : label(
      "fields.templateHint",
      "Text and the serial {xxxxx} (as many x as its least digits), with {YYYY}, {YY} and {MM} for the year and month: PHI-{YY}{xxxxx}.",
    ),
  ...(fixed ? { config: FIXED } : { validation: required("fields.templateRequired", "A template is required.") }),
});

const resetField = (fixed: boolean): PhiFormFieldDescriptor => ({
  key: "reset",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
  label: label("fields.reset", "Starts again"),
  description: label("fields.resetHint", "Every year: the serial starts at 1 on 1 January; the template then needs {YYYY} or {YY}."),
  initialValue: "none",
  options: [
    { value: "none", label: label("resets.none", "Never") },
    { value: "yearly", label: label("resets.yearly", "Every year") },
  ],
  ...(fixed ? { config: FIXED } : { validation: required("fields.resetRequired", "Choose when the serial starts again.") }),
});

const SOURCES_FIELD: PhiFormFieldDescriptor = {
  key: "sources",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
  label: label("fields.sources", "Allowed Add-ons"),
  description: label("fields.sourcesHint", "The installed Add-ons that issue documents and may number from this series."),
  initialValue: [],
  optionsProvider: { providerKey: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.issuers },
};

/** The next number, as Core answers it for the template and reset the Form holds now. */
const NEXT_PREVIEW_FIELD: PhiFormFieldDescriptor = {
  key: "next",
  fieldProviderKey: PHI_BILLING_NEXT_NUMBER_FIELD_PROVIDER_KEY,
  label: label("fields.next", "Next number"),
  description: label("fields.nextHint", "What the next document would be numbered now. Nothing is reserved."),
  optionsProvider: {
    providerKey: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.nextNumber,
    dependencies: [
      { param: "template", source: "form", valuePath: "template", required: true },
      { param: "reset", source: "form", valuePath: "reset", required: true },
    ],
  },
};

/** The series' next number as its record has it: its counter, not the template's first. */
const NEXT_RECORD_FIELD: PhiFormFieldDescriptor = {
  key: "next",
  fieldProviderKey: PHI_BILLING_NEXT_NUMBER_FIELD_PROVIDER_KEY,
  label: label("fields.next", "Next number"),
  description: label("fields.nextHint", "What the next document would be numbered now. Nothing is reserved."),
};

const hidden = (key: string): PhiFormFieldDescriptor => ({ key, fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden });

/**
 * A new series (`POST /api/site/accounting/billing-series`): its key, label, kinds, template, reset and
 * Add-ons, and the number it would give first. Core validates the template on save as the preview does,
 * and refuses a key that already has an open series.
 */
const SERIES_CREATE_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_BILLING_FORM_IDS.seriesCreate,
  labelSetKey: LABEL_SET_KEY,
  fields: [keyField(false), LABEL_FIELD, KINDS_FIELD, templateField(false), resetField(false), NEXT_PREVIEW_FIELD, SOURCES_FIELD],
};

/**
 * A series' label, kinds and Add-ons (`PATCH .../billing-series/{id}`); its key, template and reset are
 * shown and stay as they are -- a series is replaced to number differently.
 */
const SERIES_EDIT_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_BILLING_FORM_IDS.seriesEdit,
  labelSetKey: LABEL_SET_KEY,
  fields: [hidden("id"), keyField(true), LABEL_FIELD, KINDS_FIELD, templateField(true), resetField(true), NEXT_RECORD_FIELD, SOURCES_FIELD],
};

/**
 * A new series in place of one (`POST .../billing-series` with `replaces`): the same key, a template and
 * reset of its own; Core closes the series it replaces in the same step, and issuing numbers from the new
 * one at once.
 */
const SERIES_REPLACE_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_BILLING_FORM_IDS.seriesReplace,
  labelSetKey: LABEL_SET_KEY,
  fields: [hidden("replaces"), keyField(true), LABEL_FIELD, KINDS_FIELD, templateField(false), resetField(false), NEXT_PREVIEW_FIELD, SOURCES_FIELD],
};

const loadLabels = createPhiFormLabelSetLoader(
  () => import("./labels").then((module) => module.getPhiBillingSeriesFormLabels),
);

const form = (
  formId: (typeof PHI_BILLING_FORM_IDS)[keyof typeof PHI_BILLING_FORM_IDS],
  descriptor: PhiFormDescriptor,
  submitHandlerKey: (typeof PHI_BILLING_FORM_HANDLER_KEYS)[keyof typeof PHI_BILLING_FORM_HANDLER_KEYS],
  title: string,
  description: string,
) => definePhiRuntimeModuleForm({
  ownerModuleId: PHI_BILLING_RUNTIME_MODULE_ID,
  areas: ["accounting"],
  formId,
  version: 1,
  flags: 0,
  title,
  description,
  category: "forms",
  tags: ["billing", "number-series"],
  descriptor,
  submitHandlerKey,
  loadLabels,
});

export const PHI_BILLING_RUNTIME_MODULE_FORMS = [
  form(PHI_BILLING_FORM_IDS.seriesCreate, SERIES_CREATE_DESCRIPTOR, PHI_BILLING_FORM_HANDLER_KEYS.seriesCreate,
    "Add a number series", "A new number series: key, label, kinds, template, reset and the Add-ons that may number from it."),
  form(PHI_BILLING_FORM_IDS.seriesEdit, SERIES_EDIT_DESCRIPTOR, PHI_BILLING_FORM_HANDLER_KEYS.seriesEdit,
    "Change a number series", "A number series' label, kinds and allowed Add-ons; its key, template and reset stay."),
  form(PHI_BILLING_FORM_IDS.seriesReplace, SERIES_REPLACE_DESCRIPTOR, PHI_BILLING_FORM_HANDLER_KEYS.seriesReplace,
    "Replace a number series", "A new series under the same key with a template of its own; the one it replaces is closed."),
] as const;
