import {
  definePhiRuntimeModuleForm,
  type PhiRuntimeModuleFormDefinition,
} from "../../../components/forms/form-registry";
import {
  PHI_CONTACT_FORM_DESCRIPTOR,
  PHI_UNSUBSCRIBE_FORM_DESCRIPTOR,
} from "../../../components/forms/shared-form-descriptors";
import { PHI_SHARED_FORM_IDS } from "../../../components/forms/shared-form-ids";
import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./ids";

/** The Forms the Public Module registers. */
export const PHI_PUBLIC_RUNTIME_MODULE_FORMS: readonly PhiRuntimeModuleFormDefinition[] = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    areas: ["public"],
    formId: PHI_SHARED_FORM_IDS.contact,
    version: 1,
    flags: 0,
    title: "Contact",
    description: "Shared contact form preset.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_CONTACT_FORM_DESCRIPTOR,
    submitHandlerKey: "forms.contact",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/contact")
      .then((module) => module.getPhiContactFormLabels)),
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    areas: ["public"],
    formId: PHI_SHARED_FORM_IDS.unsubscribe,
    version: 1,
    flags: 0,
    title: "Unsubscribe",
    description: "Leaving a Site's circulars, from the link in one.",
    category: "preset",
    tags: ["preset", "shared"],
    descriptor: PHI_UNSUBSCRIBE_FORM_DESCRIPTOR,
    submitHandlerKey: "forms.unsubscribe",
    loadLabels: createPhiFormLabelSetLoader(() => import("../../../components/widgets/label-sets/unsubscribe")
      .then((module) => module.getPhiUnsubscribeFormLabels)),
  }),
];
