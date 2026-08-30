"use client";

import { useEffect, useMemo } from "react";

import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalAddress,
  type PhiSignalRuntimeContext,
} from "../../types/signals";
import {
  usePhiSignalDispatcher,
  usePhiSignalListener,
  type PhiSignalInput,
} from "../runtime/runtime-signal-bus";
import { registerPhiSignalInstance } from "../runtime/runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "../runtime/runtime-signal-partition";
import {
  PHI_FORM_SIGNAL_CHANNELS,
  createPhiRuntimeFormControllerAddress,
} from "./runtime-form-controller-signals";
import {
  readPhiRuntimeFormFieldSignalValue,
  readPhiRuntimeFormTouchedSignalValue,
  readPhiRuntimeFormValiditySignalValue,
  readPhiRuntimeFormValuesSignalValue,
} from "./runtime-form-state";

export type PhiRuntimeFormSubmitSignalValue = {
  formId: string;
  phase: "submit" | "confirm";
  values: Record<string, unknown>;
};

export type PhiRuntimeFormResultSignalValue = {
  ok: boolean;
  status: number;
  payload: Record<string, unknown> | null;
};

export type PhiRuntimeFormErrorSignalValue = {
  message: string;
};

export type PhiRuntimeFormControllerMountProps = {
  address?: PhiSignalAddress | null;
  instanceKey?: string | number | null;
  context?: PhiSignalRuntimeContext | null;
  registerInstance?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPhiRuntimeFormSubmitSignalValue(value: unknown): value is PhiRuntimeFormSubmitSignalValue {
  if (!isRecord(value) || !isRecord(value.values)) {
    return false;
  }

  return (
    typeof value.formId === "string" &&
    (value.phase === "submit" || value.phase === "confirm")
  );
}

function emitControllerFeedback(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  baseSignal: Pick<PhiSignalInput, "scope" | "sender" | "correlationId"> & {
    receiver: PhiSignalInput["receiver"];
  },
  input: Pick<PhiSignalInput, "channel" | "action" | "value" | "valueType" | "valueSchema">,
) {
  dispatchSignal({
    ...baseSignal,
    ...input,
    timestamp: Date.now(),
  });
}

export function PhiRuntimeFormControllerMount({
  address,
  instanceKey,
  context,
  registerInstance = true,
}: PhiRuntimeFormControllerMountProps) {
  const dispatchSignal = usePhiSignalDispatcher();
  const signalPartition = usePhiSignalRuntimePartition();
  const controllerAddress = useMemo(
    () => address ?? (instanceKey == null ? null : createPhiRuntimeFormControllerAddress(instanceKey)),
    [address, instanceKey],
  );

  usePhiSignalListener(
    (signal) => {
      if (!controllerAddress || signal.receiver !== controllerAddress) {
        return;
      }
      const isStateTransition =
        (signal.channel === PHI_FORM_SIGNAL_CHANNELS.values &&
          signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValues &&
          Boolean(readPhiRuntimeFormValuesSignalValue(signal.value))) ||
        (signal.channel === PHI_FORM_SIGNAL_CHANNELS.field &&
          signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formField &&
          Boolean(readPhiRuntimeFormFieldSignalValue(signal.value))) ||
        (signal.channel === PHI_FORM_SIGNAL_CHANNELS.validity &&
          signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formValidity &&
          Boolean(readPhiRuntimeFormValiditySignalValue(signal.value))) ||
        (signal.channel === PHI_FORM_SIGNAL_CHANNELS.touched &&
          signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formTouched &&
          Boolean(readPhiRuntimeFormTouchedSignalValue(signal.value))) ||
        (signal.channel === PHI_FORM_SIGNAL_CHANNELS.dirty &&
          signal.valueType === "boolean");
      const isReset = signal.channel === PHI_FORM_SIGNAL_CHANNELS.reset && signal.action === "activate";
      const isClear = signal.channel === PHI_FORM_SIGNAL_CHANNELS.clear && signal.action === "clear";
      if ((isStateTransition && signal.action === "change") || isReset || isClear) {
        emitControllerFeedback(
          dispatchSignal,
          {
            scope: signal.scope,
            sender: controllerAddress,
            receiver: "broadcast",
            correlationId: signal.correlationId,
          },
          {
            channel: signal.channel,
            action: signal.action,
            value: signal.value,
            valueType: signal.valueType,
            valueSchema: signal.valueSchema,
          },
        );
        return;
      }
      if (
        signal.valueSchema !== PHI_SIGNAL_VALUE_SCHEMAS.formSubmit ||
        !isPhiRuntimeFormSubmitSignalValue(signal.value)
      ) {
        return;
      }
      if (
        !(
          (signal.channel === PHI_FORM_SIGNAL_CHANNELS.submit && signal.action === "activate") ||
          (signal.channel === PHI_FORM_SIGNAL_CHANNELS.confirm && signal.action === "activate")
        )
      ) {
        return;
      }

      const feedbackReceiver = signal.sender ?? "broadcast";
      const feedbackBase = {
        scope: signal.scope,
        sender: controllerAddress,
        receiver: feedbackReceiver,
        correlationId: signal.correlationId,
      } satisfies Pick<PhiSignalInput, "scope" | "sender" | "receiver" | "correlationId">;

      emitControllerFeedback(dispatchSignal, feedbackBase, {
        channel: PHI_FORM_SIGNAL_CHANNELS.submitting,
        action: "change",
        value: true,
        valueType: "boolean",
      });

      void fetch("/api/site/forms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          formId: signal.value.formId,
          phase: signal.value.phase,
          values: signal.value.values,
        }),
      })
        .then(async (response): Promise<PhiRuntimeFormResultSignalValue> => {
          const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
          return {
            ok: response.ok,
            status: response.status,
            payload,
          };
        })
        .then((result) => {
          emitControllerFeedback(dispatchSignal, feedbackBase, {
            channel: PHI_FORM_SIGNAL_CHANNELS.result,
            action: "change",
            value: result,
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
          });
        })
        .catch((error: unknown) => {
          emitControllerFeedback(dispatchSignal, feedbackBase, {
            channel: PHI_FORM_SIGNAL_CHANNELS.error,
            action: "change",
            value: {
              message: error instanceof Error ? error.message : "Form submit failed.",
            } satisfies PhiRuntimeFormErrorSignalValue,
            valueType: "json",
            valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formError,
          });
        })
        .finally(() => {
          emitControllerFeedback(dispatchSignal, feedbackBase, {
            channel: PHI_FORM_SIGNAL_CHANNELS.submitting,
            action: "change",
            value: false,
            valueType: "boolean",
          });
        });
    },
    controllerAddress
      ? {
          receiver: controllerAddress,
          context: context ?? undefined,
        }
      : null,
    controllerAddress,
  );

  useEffect(() => {
    if (!registerInstance || !controllerAddress) {
      return undefined;
    }

    return registerPhiSignalInstance(signalPartition, {
      address: controllerAddress,
      scope: "page",
      context: context ?? undefined,
    });
  }, [context, controllerAddress, registerInstance, signalPartition]);

  return null;
}
