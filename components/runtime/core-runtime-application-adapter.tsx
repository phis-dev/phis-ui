"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { PHIS_SITE_KEY_HEADER } from "../../constants/http-headers";

const PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER = {
  scopes: ["site"],
  receiver: createPhiCoreRuntimeControllerAddress(),
} as const;

export function PhiCoreRuntimeApplicationAdapter({ siteKey }: { siteKey?: string } = {}) {
  const { message, notification } = App.useApp();
  const router = useRouter();
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

  const signOut = useCallback(async () => {
    const csrfResponse = await fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const csrfPayload = (await csrfResponse.json().catch(() => ({}))) as { token?: string };
    const csrfToken = csrfPayload.token?.trim() ?? "";
    if (!csrfResponse.ok || !csrfToken) {
      return;
    }

    const headers = new Headers({ "x-csrf-token": csrfToken });
    const normalizedSiteKey = siteKey?.trim().toLowerCase();
    if (normalizedSiteKey) {
      headers.set(PHIS_SITE_KEY_HEADER, normalizedSiteKey);
    }

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (response.ok) {
      /*
       * The Page is asked for again rather than replaced with one chosen here. Whoever is now nobody
       * may not be allowed where they stood, and the Area answers that -- with its own redirect, its
       * own sign-in Page -- which is a decision that belongs to it and not to this adapter.
       */
      router.refresh();
    }
  }, [router, siteKey]);

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

    /*
     * Out, and then back to where anybody may be.
     *
     * The door is the Site's own `/api/auth/logout`, mounted by every Site regardless of which Modules
     * it installs, so this works in an Area no Auth Module ever enters. A failed call leaves the
     * session alone and the page where it is: signing out half way and forwarding anyway would tell
     * somebody they are out while they are not.
     */
    if (signal.channel === "session" && signal.action === "clear") {
      void signOut();
      return;
    }

    /*
     * The same Page, asked for again.
     *
     * `router.refresh()` rather than `location.reload()`: it re-renders the route's Server components
     * with the cookies the browser now holds, which is the whole point, and leaves the visitor where
     * they were -- the panel they had open stays open, which a document reload would close.
     */
    if (signal.channel === "reload" && signal.action === "activate") {
      router.refresh();
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
