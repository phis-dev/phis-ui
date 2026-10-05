import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/admin/ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";

export const PHI_ADMIN_SETTINGS_FORM_IDS = {
  general: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "admin/settings-general"),
} as const;

export const PHI_ADMIN_SETTINGS_FORM_HANDLER_KEYS = {
  general: "site.admin.settings",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/admin/labels/settings" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

const required = (key: string, fallback: string) => ({
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
} as const);

const PHI_ADMIN_SETTINGS_GENERAL_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_ADMIN_SETTINGS_FORM_IDS.general,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "name",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("name", "Site name"),
      autoComplete: "organization",
      validation: [required("nameRequired", "Site name is required.")],
    },
    {
      key: "hostname",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("hostname", "Hostname"),
      autoComplete: "off",
      validation: [required("hostnameRequired", "Hostname is required.")],
    },
    {
      key: "publicBaseUrl",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.url,
      label: label("publicBaseUrl", "Public base URL"),
      autoComplete: "url",
      validation: [
        required("publicBaseUrlRequired", "Public base URL is required."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.url,
          message: label("publicBaseUrlInvalid", "Please provide a valid public base URL."),
        },
      ],
    },
    {
      key: "supportEmail",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email,
      label: label("supportEmail", "Support email"),
      autoComplete: "email",
      validation: [
        required("supportEmailRequired", "Support email is required."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email,
          message: label("supportEmailInvalid", "Please provide a valid support email address."),
        },
      ],
    },
  ],
  layout: {
    gap: { compact: "sm", medium: "base" },
  },
};

const loadLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/admin-settings").then((module) => module.getPhiAdminSettingsWidgetLabels),
  (labels) => ({
    name: labels.fields.siteName,
    nameRequired: labels.fields.siteName,
    hostname: labels.fields.hostname,
    hostnameRequired: labels.fields.hostname,
    publicBaseUrl: labels.fields.publicBaseUrl,
    publicBaseUrlRequired: labels.fields.publicBaseUrl,
    publicBaseUrlInvalid: labels.feedback.errorInvalidPublicBaseUrl,
    supportEmail: labels.fields.supportEmail,
    supportEmailRequired: labels.fields.supportEmail,
    supportEmailInvalid: labels.feedback.errorInvalidSupportEmail,
    actions: { submitLabel: labels.submitLabel },
  }),
);

export const PHI_ADMIN_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
    areas: ["admin"],
    formId: PHI_ADMIN_SETTINGS_FORM_IDS.general,
    version: 1,
    flags: 0,
    title: "General site settings",
    description: "Site identity, public base URL, and support contact for the current site.",
    category: "forms",
    tags: ["settings", "site", "admin"],
    descriptor: PHI_ADMIN_SETTINGS_GENERAL_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_ADMIN_SETTINGS_FORM_HANDLER_KEYS.general,
    loadLabels,
  }),
] as const;

export const PHI_ADMIN_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTORS = [{
  key: createPhiSharedFormProviderKey("handler", "admin-settings-general"),
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  title: "Admin site settings",
  phase: "submit",
  handlerKey: PHI_ADMIN_SETTINGS_FORM_HANDLER_KEYS.general,
  category: "site",
  transport: "relay",
  method: "PATCH",
  endpointKey: null,
  upstreamPath: "/api/site/admin/settings",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
}] satisfies readonly PhiFormHandlerProviderDescriptor[];
