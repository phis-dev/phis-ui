import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import type { PhiFormLabelSetLoader } from "../../../components/forms/form-resolution";

export const PHI_BUILDER_SIGNAL_WIRING_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/signal-wiring");
const PHI_BUILDER_SIGNAL_WIRING_FORM_LABEL_SET_KEY = "@phis/ui/modules/builder/labels/signal-wiring" as const;

const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

/**
 * The Signal wiring Form.
 *
 * Four selects, each backed by an options provider rather than a static list, because what may be
 * chosen depends on what was chosen before it: a sender endpoint offers its own outputs, and only
 * receivers that can take that output are offered at all. The providers read the wiring session from the
 * Builder workspace store, which the Builder controller keeps in step with this Form as it is edited.
 *
 * Per the Form contract the descriptor carries no actions and no presentation -- Apply and Cancel are
 * the overlay's footer, and the overlay decides that it is a Modal.
 */
const descriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_BUILDER_SIGNAL_WIRING_FORM_ID,
  labelSetKey: PHI_BUILDER_SIGNAL_WIRING_FORM_LABEL_SET_KEY,
  layout: { columns: { compact: 1, medium: 2 }, gap: { compact: "sm", medium: "base" } },
  fields: [
    {
      key: "senderAddress",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("fields.senderAddress.label", "Sender endpoint"),
      validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: label("fields.senderAddress.required", "Pick the endpoint that emits.") }],
      optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalSenders },
    },
    {
      key: "senderCapabilityId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("fields.senderCapabilityId.label", "Sender output"),
      validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: label("fields.senderCapabilityId.required", "Pick the output to route.") }],
      optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalSenderCapabilities },
      disabledWhen: { source: "form", valuePath: "senderAddress", operator: "falsy" },
    },
    {
      key: "receiverAddress",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("fields.receiverAddress.label", "Receiver endpoint"),
      validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: label("fields.receiverAddress.required", "Pick the endpoint that receives.") }],
      optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalReceivers },
      disabledWhen: { source: "form", valuePath: "senderCapabilityId", operator: "falsy" },
    },
    {
      key: "receiverCapabilityId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("fields.receiverCapabilityId.label", "Receiver input"),
      validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: label("fields.receiverCapabilityId.required", "Pick the input to route into.") }],
      optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalReceiverCapabilities },
      disabledWhen: { source: "form", valuePath: "receiverAddress", operator: "falsy" },
    },
  ],
};

/*
 * The four field labels come from the Signals label set, which already carried this vocabulary from the
 * Modal that predated the overlay contract -- `senderEndpoint`, `senderOutput`, `receiverEndpoint`,
 * `receiverInput` outlived the surface that used them. The required messages have no entry there and
 * fall back to their literals until one exists.
 */
const loadPhiBuilderSignalWiringFormLabels: PhiFormLabelSetLoader = async ({ runtime }) => {
  const { getPhiSignalsWidgetLabels } = await import("../../../components/widgets/label-sets/signals");
  const labels = await getPhiSignalsWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  return {
    "fields.senderAddress.label": labels.routes.senderEndpoint,
    "fields.senderCapabilityId.label": labels.routes.senderOutput,
    "fields.receiverAddress.label": labels.routes.receiverEndpoint,
    "fields.receiverCapabilityId.label": labels.routes.receiverInput,
  };
};

export const PHI_BUILDER_SIGNAL_WIRING_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  formId: PHI_BUILDER_SIGNAL_WIRING_FORM_ID,
  version: 1,
  flags: 0,
  title: "Builder signal wiring",
  description: "Route one Signal from the selected block to a receiver in the same Area.",
  category: "forms",
  tags: ["builder", "signals"],
  descriptor,
  loadLabels: loadPhiBuilderSignalWiringFormLabels,
  submitHandlerKey: null,
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  variant: "default",
  config: {},
  previewUpstreamPath: null,
});
