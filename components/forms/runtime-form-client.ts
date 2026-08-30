"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignal,
  type PhiSignalAddress,
  type PhiSignalScope,
  type PhiSignalValueSchema,
} from "../../types/signals";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../runtime/runtime-signal-identity";
import {
  PHI_FORM_SIGNAL_CHANNELS,
} from "./runtime-form-controller-signals";
import type {
  PhiRuntimeFormErrorSignalValue,
  PhiRuntimeFormResultSignalValue,
  PhiRuntimeFormSubmitSignalValue,
} from "./runtime-form-controller-mount";

export type PhiRuntimeFormSubmitResult = PhiRuntimeFormResultSignalValue;

export type PhiRuntimeFormSubmitOptions = {
  formId: string;
  values: Record<string, unknown>;
  phase?: "submit" | "confirm";
  correlationId?: string;
};

export type PhiRuntimeFormClient = {
  submit(options: PhiRuntimeFormSubmitOptions): Promise<PhiRuntimeFormSubmitResult>;
  setValues(values: Record<string, unknown>): void;
  setField(fieldKey: string, value: unknown): void;
  reset(options?: { correlationId?: string }): void;
  clear(options?: { correlationId?: string }): void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRuntimeFormResult(value: unknown): PhiRuntimeFormResultSignalValue | null {
  if (!isRecord(value) || typeof value.ok !== "boolean" || typeof value.status !== "number") {
    return null;
  }

  return {
    ok: value.ok,
    status: value.status,
    payload: isRecord(value.payload) ? value.payload : null,
  };
}

function readRuntimeFormError(value: unknown): PhiRuntimeFormErrorSignalValue | null {
  return isRecord(value) && typeof value.message === "string"
    ? { message: value.message }
    : null;
}

export function usePhiRuntimeFormClient({
  controllerAddress,
  scope = "page",
}: {
  controllerAddress?: PhiSignalAddress | null;
  scope?: PhiSignalScope;
}): PhiRuntimeFormClient {
  const identity = usePhiSignalIdentity();
  const dispatchSignal = usePhiSignalDispatcher();
  const pendingRef = useRef(
    new Map<string, {
      resolve: (result: PhiRuntimeFormSubmitResult) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }>(),
  );

  usePhiSignalListener(
    (signal: PhiSignal) => {
      const pending = pendingRef.current;
      const entry = pending.get(signal.correlationId);
      if (!entry) {
        return;
      }

      if (
        signal.channel === PHI_FORM_SIGNAL_CHANNELS.result &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formResult
      ) {
        const result = readRuntimeFormResult(signal.value);
        if (!result) {
          return;
        }
        pending.delete(signal.correlationId);
        clearTimeout(entry.timeout);
        entry.resolve(result);
        return;
      }

      if (
        signal.channel === PHI_FORM_SIGNAL_CHANNELS.error &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formError
      ) {
        const error = readRuntimeFormError(signal.value);
        if (!error) {
          return;
        }
        pending.delete(signal.correlationId);
        clearTimeout(entry.timeout);
        entry.reject(new Error(error.message));
      }
    },
    undefined,
  );

  const submit = useCallback<PhiRuntimeFormClient["submit"]>(
    ({ formId, values, phase = "submit", correlationId: requestedCorrelationId }) => {
      if (!controllerAddress) {
        throw new Error("Runtime form controller address is required.");
      }

      const correlationId = requestedCorrelationId ?? createPhiSignalCorrelationId();
      const signalValue: PhiRuntimeFormSubmitSignalValue = {
        formId,
        phase,
        values,
      };

      return new Promise<PhiRuntimeFormSubmitResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const entry = pendingRef.current.get(correlationId);
          if (!entry) return;
          pendingRef.current.delete(correlationId);
          entry.reject(new Error("Form submission timed out."));
        }, 30_000);
        pendingRef.current.set(correlationId, { resolve, reject, timeout });
        dispatchSignal({
          scope,
          channel: phase === "confirm" ? PHI_FORM_SIGNAL_CHANNELS.confirm : PHI_FORM_SIGNAL_CHANNELS.submit,
          action: "activate",
          value: signalValue,
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formSubmit,
          sender: identity.sender,
          receiver: controllerAddress,
          correlationId,
          timestamp: Date.now(),
        });
      });
    },
    [controllerAddress, dispatchSignal, identity.sender, scope],
  );

  useEffect(() => () => {
    for (const entry of pendingRef.current.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Form submission was cancelled."));
    }
    pendingRef.current.clear();
  }, []);

  const dispatchCommand = useCallback((input: {
    channel: string;
    action: "change" | "activate" | "clear";
    value?: unknown;
    valueType: "json" | "none";
    valueSchema?: PhiSignalValueSchema;
    correlationId?: string;
  }) => {
    if (!controllerAddress) {
      throw new Error("Runtime form controller address is required.");
    }
    dispatchSignal({
      scope,
      ...input,
      value: input.value ?? null,
      sender: identity.sender,
      receiver: controllerAddress,
      correlationId: input.correlationId ?? createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    });
  }, [controllerAddress, dispatchSignal, identity.sender, scope]);

  const setValues = useCallback<PhiRuntimeFormClient["setValues"]>((values) => {
    dispatchCommand({ channel: PHI_FORM_SIGNAL_CHANNELS.values, action: "change",
      value: { values }, valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues });
  }, [dispatchCommand]);
  const setField = useCallback<PhiRuntimeFormClient["setField"]>((fieldKey, value) => {
    dispatchCommand({ channel: PHI_FORM_SIGNAL_CHANNELS.field, action: "change",
      value: { fieldKey, value }, valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField });
  }, [dispatchCommand]);
  const reset = useCallback((options?: { correlationId?: string }) => {
    dispatchCommand({ channel: PHI_FORM_SIGNAL_CHANNELS.reset, action: "activate", valueType: "none", correlationId: options?.correlationId });
  }, [dispatchCommand]);
  const clear = useCallback((options?: { correlationId?: string }) => {
    dispatchCommand({ channel: PHI_FORM_SIGNAL_CHANNELS.clear, action: "clear", valueType: "none", correlationId: options?.correlationId });
  }, [dispatchCommand]);

  return useMemo(
    () => ({ submit, setValues, setField, reset, clear }),
    [clear, reset, setField, setValues, submit],
  );
}
