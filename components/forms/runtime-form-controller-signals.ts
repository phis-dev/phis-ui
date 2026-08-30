import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalInputCapability,
  type PhiSignalOutputCapability,
} from "../../types/signals";
export { PHI_FORM_CONTROLLER_KEY, createPhiRuntimeFormControllerAddress } from "./runtime-form-controller-address";

export const PHI_FORM_SIGNAL_CHANNELS = {
  values: "values",
  field: "field",
  validity: "validity",
  touched: "touched",
  dirty: "dirty",
  submitting: "submitting",
  submit: "submit",
  confirm: "confirm",
  reset: "reset",
  clear: "clear",
  result: "result",
  error: "error",
} as const;

export const PHI_RUNTIME_FORM_CONTROLLER_EMITS = [
  {
    id: "values",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
  },
  {
    id: "field",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField,
  },
  {
    id: "validity",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity,
  },
  {
    id: "touched",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formTouched,
  },
  {
    id: "dirty",
    action: "change",
    valueType: "boolean",
  },
  {
    id: "submitting",
    action: "change",
    valueType: "boolean",
  },
  {
    id: "result",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
  },
  {
    id: "error",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formError,
  },
  { id: "reset", action: "activate", valueType: "none" },
  { id: "clear", action: "clear", valueType: "none" },
] as const satisfies readonly PhiSignalOutputCapability[];

export const PHI_RUNTIME_FORM_CONTROLLER_LISTENS = [
  {
    id: "values",
    channel: PHI_FORM_SIGNAL_CHANNELS.values,
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
  },
  {
    id: "field",
    channel: PHI_FORM_SIGNAL_CHANNELS.field,
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField,
  },
  {
    id: "validity",
    channel: PHI_FORM_SIGNAL_CHANNELS.validity,
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity,
  },
  {
    id: "touched",
    channel: PHI_FORM_SIGNAL_CHANNELS.touched,
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formTouched,
  },
  {
    id: "dirty",
    channel: PHI_FORM_SIGNAL_CHANNELS.dirty,
    action: "change",
    valueType: "boolean",
  },
  {
    id: "submit",
    channel: PHI_FORM_SIGNAL_CHANNELS.submit,
    action: "activate",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formSubmit,
  },
  {
    id: "confirm",
    channel: PHI_FORM_SIGNAL_CHANNELS.confirm,
    action: "activate",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formSubmit,
  },
  {
    id: "reset",
    channel: PHI_FORM_SIGNAL_CHANNELS.reset,
    action: "activate",
    valueType: "none",
  },
  {
    id: "clear",
    channel: PHI_FORM_SIGNAL_CHANNELS.clear,
    action: "clear",
    valueType: "none",
  },
] as const satisfies readonly PhiSignalInputCapability[];
