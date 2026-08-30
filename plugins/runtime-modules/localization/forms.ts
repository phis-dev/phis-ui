import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { createPhiFormId } from "../../../types/form-id";
import type { PhiFormDescriptor, PhiFormHandlerProviderDescriptor } from "../../../types/form-descriptor";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/localization/ids";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";

export const PHI_LOCALIZATION_FORM_IDS = {
  siteLocales: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "localization/site-locales"),
  editorTranslation: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "localization/editor-translation"),
} as const;

export const PHI_LOCALIZATION_FORM_HANDLER_KEYS = {
  siteLocales: "localization.site-locales",
  editorTranslation: "localization.editor-translation",
} as const;

/**
 * The leaf each handler is named by. It is stated rather than derived from the object key above: a
 * public identifier that borrows a TypeScript property name inherits camelCase from it, which is how
 * these two became the only identifiers in the package that are not kebab-case.
 */
const PHI_LOCALIZATION_FORM_HANDLER_LEAVES = {
  siteLocales: "site-locales",
  editorTranslation: "editor-translation",
} as const satisfies Record<keyof typeof PHI_LOCALIZATION_FORM_HANDLER_KEYS, string>;

const LABEL_SET_KEY = "@phis/ui/modules/localization/labels/forms" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const required = (key: string, fallback: string) => ([{
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
}] as const);

const translationFields = [
  { key: "action", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden, initialValue: "translation" },
  { key: "msgId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  { key: "locale", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  {
    key: "translation",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
    label: label("translationLabel", "Translation"),
    placeholder: label("translationPlaceholder", "Enter translation"),
    validation: required("saveError", "A translation is required."),
    config: { rows: 6 },
  },
] as const;

function translationDescriptor(formId: string): PhiFormDescriptor {
  return {
    schemaVersion: 1,
    key: formId,
    labelSetKey: LABEL_SET_KEY,
    fields: translationFields,
  };
}

async function loadAdminLabels(context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0]) {
  const { getPhiAdminLocalesWidgetLabels } = await import("../../../components/widgets/label-sets/admin-locales");
  const labels = await getPhiAdminLocalesWidgetLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    defaultLocaleLabel: labels.defaultLocaleLabel,
    availableLocalesLabel: labels.availableLocalesLabel,
    saveLabel: labels.saveLocalesLabel,
    savingLabel: labels.saveLocalesLabel,
    searchLabel: labels.searchPlaceholder,
    searchPlaceholder: labels.searchPlaceholder,
    languageLabel: labels.languageLabel,
    applyLabel: "Apply",
    resetLabel: labels.resetLabel,
    reloadLabel: labels.refreshLabel,
    translationLabel: labels.edit.translationLabel,
    translationPlaceholder: labels.edit.translationLabel,
    saveError: labels.errors.save,
  });
}

async function loadEditorLabels(context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0]) {
  const { getPhiEditorTranslationsWidgetLabels } = await import("../../../components/widgets/label-sets/editor-translations");
  const labels = await getPhiEditorTranslationsWidgetLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    saveLabel: labels.actions.save,
    savingLabel: labels.actions.save,
    translationLabel: labels.columns.translation,
    translationPlaceholder: labels.translationPlaceholder,
    saveError: labels.errors.save,
  });
}

export const PHI_LOCALIZATION_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    formId: PHI_LOCALIZATION_FORM_IDS.siteLocales,
    version: 1,
    flags: 0,
    title: "Site locales",
    description: "Configure the site's default and available locales.",
    category: "forms",
    tags: ["localization", "settings"],
    descriptor: {
      schemaVersion: 1,
      key: PHI_LOCALIZATION_FORM_IDS.siteLocales,
      labelSetKey: LABEL_SET_KEY,
      fields: [
        { key: "action", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden, initialValue: "site-locales" },
        {
          key: "availableLocales",
          fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
          label: label("availableLocalesLabel", "Available languages"),
          optionsProvider: { providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.platformLocales },
          validation: required("saveError", "Select at least one language."),
        },
        {
          key: "defaultLocale",
          fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
          label: label("defaultLocaleLabel", "Default language"),
          optionsProvider: { providerKey: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.platformLocales },
          validation: required("saveError", "Select a default language."),
        },
      ],
    },
    submitHandlerKey: PHI_LOCALIZATION_FORM_HANDLER_KEYS.siteLocales,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: loadAdminLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
    formId: PHI_LOCALIZATION_FORM_IDS.editorTranslation,
    version: 1,
    flags: 0,
    title: "Editor translation editor",
    description: "Edit one site translation from the Editor table.",
    category: "forms",
    tags: ["localization", "translation"],
    descriptor: translationDescriptor(PHI_LOCALIZATION_FORM_IDS.editorTranslation),
    submitHandlerKey: PHI_LOCALIZATION_FORM_HANDLER_KEYS.editorTranslation,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: loadEditorLabels,
  }),
] as const;

export const PHI_LOCALIZATION_FORM_HANDLER_PROVIDER_DESCRIPTORS = Object.entries(
  PHI_LOCALIZATION_FORM_HANDLER_KEYS,
).map(([key, handlerKey]) => ({
  key: createPhiSharedFormProviderKey(
    "handler",
    `localization-${PHI_LOCALIZATION_FORM_HANDLER_LEAVES[key as keyof typeof PHI_LOCALIZATION_FORM_HANDLER_LEAVES]}`,
  ),
  ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  title: `Localization ${key}`,
  phase: "submit",
  handlerKey,
  category: "forms",
  transport: "relay",
  method: "PATCH",
  endpointKey: null,
  upstreamPath: key === "siteLocales"
    ? "/api/site/admin/locales"
    : "/api/site/editor/translations",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
})) satisfies readonly PhiFormHandlerProviderDescriptor[];
