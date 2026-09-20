import type { PhiFormDescriptor } from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_REVISIONS_FORM_IDS = {
  deleteArea: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "revisions/delete-area"),
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/revisions/labels/forms" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

/**
 * The typed confirmation for deleting an Area's own shell.
 *
 * One field, and it is the whole point: the Area's key has to be written out before the command will
 * go. It is a threshold against reflex, not against an attacker -- whoever can press the button can
 * also call the route -- so the match is checked by the Revisions Controller, which is where the Area
 * this dialog is about actually lives. The Form's own validation can only say that something was
 * typed; what was typed is compared against a value no descriptor can hold.
 *
 * `submitHandlerKey` is therefore null. This Form does not reach a gateway; it hands its validated
 * value to a domain Controller, which is the second of the two submit modes in
 * `components/forms/PRESET_FORMS_HOWTO.md`.
 */
const PHI_REVISIONS_DELETE_AREA_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_REVISIONS_FORM_IDS.deleteArea,
  labelSetKey: LABEL_SET_KEY,
  // No layout of its own: one field, on the columns every other Form in the house falls into.
  fields: [
    {
      key: "areaKey",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("areaKey", "Type the Area key to confirm"),
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("areaKeyRequired", "Write the Area key out to confirm."),
      }],
    },
  ],
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiBuilderRevisionsWidgetLabels } = await import("../../../components/widgets/label-sets/revisions");
  const labels = await getPhiBuilderRevisionsWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    areaKey: labels.deleteArea.field,
    areaKeyRequired: labels.deleteArea.fieldRequired,
  });
}

export const PHI_REVISIONS_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    areas: ["builder"],
    formId: PHI_REVISIONS_FORM_IDS.deleteArea,
    version: 1,
    flags: 0,
    title: "Delete Area",
    description: "Confirms deleting an Area's own shell by writing the Area key out.",
    category: "forms",
    tags: ["revisions", "area"],
    descriptor: PHI_REVISIONS_DELETE_AREA_FORM_DESCRIPTOR,
    submitHandlerKey: null,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  }),
] as const;
