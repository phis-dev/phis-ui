"use client";

import { useCallback, useMemo } from "react";

import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiCoreRuntimeMessageValue,
  type PhiCoreRuntimeNotificationValue,
} from "../../types";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import { usePhiSignalEmitter } from "./runtime-signal-identity";

export type PhiApplicationFeedbackOptions = {
  correlationId?: string | null;
};

export function usePhiApplicationFeedback() {
  const emitSignal = usePhiSignalEmitter();

  const showMessage = useCallback((
    value: PhiCoreRuntimeMessageValue,
    options?: PhiApplicationFeedbackOptions,
  ) => {
    emitSignal({
      scope: "site",
      channel: "message",
      action: "activate",
      receiver: createPhiCoreRuntimeControllerAddress(),
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.message,
      value,
      ...(options?.correlationId ? { correlationId: options.correlationId } : {}),
    });
  }, [emitSignal]);

  const showNotification = useCallback((
    value: PhiCoreRuntimeNotificationValue,
    options?: PhiApplicationFeedbackOptions,
  ) => {
    emitSignal({
      scope: "site",
      channel: "notification",
      action: "activate",
      receiver: createPhiCoreRuntimeControllerAddress(),
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.notification,
      value,
      ...(options?.correlationId ? { correlationId: options.correlationId } : {}),
    });
  }, [emitSignal]);

  return useMemo(() => ({
    showMessage,
    showNotification,
  }), [showMessage, showNotification]);
}
