"use client";

import { useEffect, useRef } from "react";
import { App } from "antd";

import type {
  PhiCoreRuntimeMessageValue,
  PhiCoreRuntimeNotificationValue,
} from "../../types/core-runtime-controller";

/**
 * One thing the runtime was asked to say, waiting to be said.
 *
 * Keyed, because the queue outlives the moment: what arrives while the host is still being fetched has
 * to be told apart from what has already been shown, and a message is not unique by its own content --
 * the same "Saved" twice is two announcements.
 */
export type PhiApplicationFeedbackRequest =
  | { key: number; kind: "message"; value: PhiCoreRuntimeMessageValue }
  | { key: number; kind: "notification"; value: PhiCoreRuntimeNotificationValue };

export type PhiApplicationFeedbackHostProps = {
  requests: readonly PhiApplicationFeedbackRequest[];
  onPlayed: (keys: readonly number[]) => void;
};

function PhiApplicationFeedbackPlayer({ requests, onPlayed }: PhiApplicationFeedbackHostProps) {
  const { message, notification } = App.useApp();
  /*
   * What has already been shown, remembered here rather than derived from the queue.
   *
   * The queue is a prop: it still holds a request during the render that follows showing it, and in
   * development an effect runs twice on purpose. Either would announce the same thing again.
   */
  const played = useRef(new Set<number>());

  useEffect(() => {
    const shown: number[] = [];
    for (const request of requests) {
      if (played.current.has(request.key)) continue;
      played.current.add(request.key);
      shown.push(request.key);
      if (request.kind === "notification") {
        notification[request.value.level]({
          title: request.value.title,
          ...(request.value.description ? { description: request.value.description } : {}),
          ...(request.value.durationSeconds != null
            ? { duration: request.value.durationSeconds }
            : {}),
          ...(request.value.placement ? { placement: request.value.placement } : {}),
          ...(request.value.showTimeoutProgress != null
            ? { showProgress: request.value.showTimeoutProgress }
            : {}),
          role: request.value.level === "error" || request.value.level === "warning"
            ? "alert"
            : "status",
        });
        continue;
      }
      message.open({
        type: request.value.level,
        content: request.value.content,
        ...(request.value.durationSeconds != null
          ? { duration: request.value.durationSeconds }
          : {}),
      });
    }
    if (shown.length > 0) onPlayed(shown);
  }, [message, notification, onPlayed, requests]);

  return null;
}

/**
 * Ant Design's `App`, mounted when the Site first has something to say.
 *
 * It used to wrap every page from the root layout, which put the message, notification and modal
 * runtimes into the first load of every route: measured on the Public landing page, 62 KB raw and
 * 23 KB over the wire, on a page that draws four texts and one switch. Almost none of it is the
 * `rc-*` packages -- 52 KB is Ant Design's own `app`, `message`, `notification` and `modal` with
 * their style modules.
 *
 * It is a sibling of the page rather than its parent now, because it no longer has anything to
 * provide to it: the Core application adapter is the only consumer of `App.useApp()`, and it is
 * here. A confirmation with nothing to anchor to is `usePhiConfirmDialog`, not an imperative modal.
 */
export function PhiApplicationFeedbackHost({ requests, onPlayed }: PhiApplicationFeedbackHostProps) {
  return (
    <App>
      <PhiApplicationFeedbackPlayer requests={requests} onPlayed={onPlayed} />
    </App>
  );
}
