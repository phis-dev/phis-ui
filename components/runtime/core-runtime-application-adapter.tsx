"use client";
import { fetchPhiCsrfToken } from "../../helpers/csrf-token";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

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
import type { PhiApplicationFeedbackRequest } from "./application-feedback-host";

/*
 * Fetched the first time this Site has something to say, and not before.
 *
 * `ssr: false` because there is nothing to render on the server: a queue that is empty during the
 * server render is empty in the HTML too, and the host exists only to play what arrives afterwards.
 */
const PhiLazyApplicationFeedbackHost = dynamic(
  () => import("./application-feedback-host").then((module) => module.PhiApplicationFeedbackHost),
  { ssr: false },
);

const PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER = {
  scopes: ["site"],
  receiver: createPhiCoreRuntimeControllerAddress(),
} as const;

export function PhiCoreRuntimeApplicationAdapter({ siteKey }: { siteKey?: string } = {}) {
  const router = useRouter();
  /*
   * Armed once and never disarmed: the host owns the toast that is on screen, so unmounting it when
   * the queue runs dry would take the announcement down with it. What empties is the queue.
   */
  const [armed, setArmed] = useState(false);
  const [requests, setRequests] = useState<readonly PhiApplicationFeedbackRequest[]>([]);
  const nextRequestKey = useRef(0);

  const enqueue = useCallback((request: Omit<PhiApplicationFeedbackRequest, "key">) => {
    const key = (nextRequestKey.current += 1);
    setArmed(true);
    setRequests((current) => [...current, { ...request, key } as PhiApplicationFeedbackRequest]);
  }, []);

  const handlePlayed = useCallback((keys: readonly number[]) => {
    const played = new Set(keys);
    setRequests((current) => current.filter((request) => !played.has(request.key)));
  }, []);
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
    /* A session that cannot be ended here is ended by its own expiry; there is no surface to report to. */
    let csrfToken: string;
    try {
      csrfToken = await fetchPhiCsrfToken();
    } catch {
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

    /*
     * Queued rather than shown. What draws a toast is Ant Design's `App`, and it is fetched the first
     * time a Site actually has something to say -- so the announcement waits for its host instead of
     * every page waiting for the announcement.
     */
    const notificationValue = readPhiCoreRuntimeNotificationSignalValue(signal);
    if (notificationValue) {
      enqueue({ kind: "notification", value: notificationValue });
      return;
    }

    const messageValue = readPhiCoreRuntimeMessageSignalValue(signal);
    if (messageValue) {
      enqueue({ kind: "message", value: messageValue });
    }
  }, PHI_CORE_RUNTIME_APPLICATION_SIGNAL_FILTER, address);

  return armed
    ? <PhiLazyApplicationFeedbackHost requests={requests} onPlayed={handlePlayed} />
    : null;
}
