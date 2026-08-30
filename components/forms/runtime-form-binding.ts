"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { PhiFormControlFormInstance } from "../controls/phi-form-control";

import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalAddress,
  type PhiSignalScope,
} from "../../types/signals";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../runtime/runtime-signal-identity";
import { PHI_FORM_SIGNAL_CHANNELS } from "./runtime-form-controller-signals";
import {
  readPhiRuntimeFormFieldSignalValue,
  readPhiRuntimeFormValuesSignalValue,
} from "./runtime-form-state";

export function usePhiRuntimeFormBinding({
  formRef,
  fieldKeys,
  controllerAddress,
  scope,
  onValuesChange,
}: {
  formRef: RefObject<PhiFormControlFormInstance | null>;
  fieldKeys: readonly string[];
  controllerAddress?: PhiSignalAddress | null;
  scope: PhiSignalScope;
  onValuesChange?: (changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => void;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const identity = usePhiSignalIdentity();
  const changedFieldKeysRef = useRef(new Set<string>());
  const dirtyRef = useRef(false);

  usePhiSignalListener((signal) => {
    if (!controllerAddress || signal.sender !== controllerAddress) {
      return;
    }
    if (signal.channel === PHI_FORM_SIGNAL_CHANNELS.values && signal.action === "change" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues) {
      const payload = readPhiRuntimeFormValuesSignalValue(signal.value);
      if (payload) formRef.current?.setFieldsValue(payload.values);
      return;
    }
    if (signal.channel === PHI_FORM_SIGNAL_CHANNELS.field && signal.action === "change" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formField) {
      const payload = readPhiRuntimeFormFieldSignalValue(signal.value);
      if (payload) formRef.current?.setFieldValue(payload.fieldKey, payload.value);
      return;
    }
    if (signal.channel === PHI_FORM_SIGNAL_CHANNELS.reset && signal.action === "activate") {
      dirtyRef.current = false;
      changedFieldKeysRef.current.clear();
      formRef.current?.resetFields();
      return;
    }
    if (signal.channel === PHI_FORM_SIGNAL_CHANNELS.clear && signal.action === "clear") {
      dirtyRef.current = false;
      changedFieldKeysRef.current.clear();
      formRef.current?.setFieldsValue(Object.fromEntries(fieldKeys.map((fieldKey) => [fieldKey, undefined])));
    }
  }, undefined, identity.sender);

  const publishSnapshot = useCallback(() => {
    if (!controllerAddress) return;
    const form = formRef.current;
    if (!form) return;
    const base = {
      scope,
      sender: identity.sender,
      receiver: controllerAddress,
      correlationId: createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    } as const;
    const values = form.getFieldsValue(true);
    dispatchSignal({ ...base, channel: PHI_FORM_SIGNAL_CHANNELS.values, action: "change",
      value: { values }, valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues });
    for (const fieldKey of changedFieldKeysRef.current) {
      dispatchSignal({ ...base, channel: PHI_FORM_SIGNAL_CHANNELS.field, action: "change",
        value: { fieldKey, value: values[fieldKey] }, valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField });
    }
    changedFieldKeysRef.current.clear();
    dispatchSignal({ ...base, channel: PHI_FORM_SIGNAL_CHANNELS.touched, action: "change",
      value: { fieldKeys: fieldKeys.filter((fieldKey) => form.isFieldTouched(fieldKey)) },
      valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formTouched });
    const errors = Object.fromEntries(form.getFieldsError().flatMap(({ name, errors: messages }) => {
      const fieldKey = String(name[0] ?? "");
      return fieldKey && messages.length > 0 ? [[fieldKey, messages]] : [];
    }));
    dispatchSignal({ ...base, channel: PHI_FORM_SIGNAL_CHANNELS.validity, action: "change",
      value: { valid: Object.keys(errors).length === 0, errors }, valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity });
    dispatchSignal({ ...base, channel: PHI_FORM_SIGNAL_CHANNELS.dirty, action: "change",
      value: dirtyRef.current, valueType: "boolean" });
  }, [controllerAddress, dispatchSignal, fieldKeys, formRef, identity.sender, scope]);

  return {
    onValuesChange(changedValues: Record<string, unknown>, allValues: Record<string, unknown>) {
      dirtyRef.current = true;
      Object.keys(changedValues).forEach((fieldKey) => changedFieldKeysRef.current.add(fieldKey));
      onValuesChange?.(changedValues, allValues);
    },
    onBlurCapture() { queueMicrotask(publishSnapshot); },
    reset() {
      if (!controllerAddress) {
        dirtyRef.current = false;
        changedFieldKeysRef.current.clear();
        formRef.current?.resetFields();
        return;
      }
      dispatchSignal({
        scope,
        channel: PHI_FORM_SIGNAL_CHANNELS.reset,
        action: "activate",
        value: null,
        valueType: "none",
        sender: identity.sender,
        receiver: controllerAddress,
        correlationId: createPhiSignalCorrelationId(),
        timestamp: Date.now(),
      });
    },
    publishSnapshot,
  };
}
