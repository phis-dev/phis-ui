"use client";

import { App } from "antd";

import {
  readPhiCoreRuntimeMessageSignalValue,
  readPhiCoreRuntimeNotificationSignalValue,
} from "../../types/core-runtime-controller";
import { usePhiSignalListener } from "./runtime-signal-bus";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";

const PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER = {
  scopes: ["site"],
  receiver: createPhiCoreRuntimeControllerAddress(),
} as const;

export function PhiCoreRuntimeApplicationAdapter() {
  const { message, notification } = App.useApp();

  usePhiSignalListener((signal) => {
    const notificationValue = readPhiCoreRuntimeNotificationSignalValue(signal);
    if (notificationValue) {
      notification[notificationValue.level]({
        title: notificationValue.title,
        ...(notificationValue.description ? { description: notificationValue.description } : {}),
        ...(notificationValue.durationSeconds != null
          ? { duration: notificationValue.durationSeconds }
          : {}),
        ...(notificationValue.placement ? { placement: notificationValue.placement } : {}),
        ...(notificationValue.showTimeoutProgress != null
          ? { showProgress: notificationValue.showTimeoutProgress }
          : {}),
        role: notificationValue.level === "error" || notificationValue.level === "warning"
          ? "alert"
          : "status",
      });
      return;
    }

    const messageValue = readPhiCoreRuntimeMessageSignalValue(signal);
    if (messageValue) {
      message.open({
        type: messageValue.level,
        content: messageValue.content,
        ...(messageValue.durationSeconds != null
          ? { duration: messageValue.durationSeconds }
          : {}),
      });
    }
  }, PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER, null);

  return null;
}
