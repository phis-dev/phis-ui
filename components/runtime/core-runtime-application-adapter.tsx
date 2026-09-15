"use client";

import { useEffect } from "react";
import { App } from "antd";

import {
  readPhiCoreRuntimeMessageSignalValue,
  readPhiCoreRuntimeNavigateSignalValue,
  readPhiCoreRuntimeNotificationSignalValue,
} from "../../types/core-runtime-controller";
import { usePhiSignalListener } from "./runtime-signal-bus";
import { usePhiSignalRuntimePartition } from "./runtime-signal-partition";
import { registerPhiSignalInstance } from "./runtime-signal-registry";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";

const PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER = {
  scopes: ["site"],
  receiver: createPhiCoreRuntimeControllerAddress(),
} as const;

export function PhiCoreRuntimeApplicationAdapter() {
  const { message, notification } = App.useApp();
  const partition = usePhiSignalRuntimePartition();
  const address = createPhiCoreRuntimeControllerAddress();

  /*
   * The Runtime Controller's address has to exist before anything can be sent to it.
   *
   * A signal naming an unregistered address is held rather than dropped -- the receiver may simply not
   * have mounted yet -- so an address nobody ever registers means every signal to it waits forever. That
   * is what happened to the forward a finished sign-in asks for: the Controller is this adapter, and it
   * was listening without ever having said that it answers here. Listening is not the same as existing.
   */
  useEffect(() => registerPhiSignalInstance(partition, { address, scope: "site" }), [address, partition]);

  usePhiSignalListener((signal) => {
    const navigateValue = readPhiCoreRuntimeNavigateSignalValue(signal);
    if (navigateValue) {
      if (navigateValue.replace) {
        window.location.replace(navigateValue.path);
      } else {
        window.location.assign(navigateValue.path);
      }
      return;
    }

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
  }, PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER, address);

  return null;
}
