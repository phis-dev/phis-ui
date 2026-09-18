"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flex, Typography } from "antd";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import type { PhisThreadDetail, PhisThreadMessage } from "../../../../../types/threads";
import { PhisThreadMessageFlag, PhisThreadStatus } from "../../../../../constants/threads";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import {
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../../../../../components/runtime/runtime-signal-bus";
import type { PhiSignalFilter } from "../../../../../types/signals";
import type { PhiThreadConversationLabels } from "../../../../../components/widgets/label-sets/threads";

export type PhiThreadConversationWidgetClientProps = PhiClientBlockBaseProps<
  PhiThreadConversationLabels,
  { padding?: number | string },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

/** Somebody picked a conversation -- a listing, or this widget reading it off the address. */
const PHI_THREAD_SELECTION_FILTER: PhiSignalFilter = { channels: ["thread"], actions: ["change"] };

/**
 * Something was written into a conversation and what is on screen is now behind.
 *
 * `reload` rather than a second `change`: the conversation has not changed, only its contents, and a
 * `change` would put every listener through switching to a thread they are already in -- which for the
 * composer means clearing the message somebody is halfway through typing.
 */
const PHI_THREAD_RELOAD_FILTER: PhiSignalFilter = { channels: ["thread"], actions: ["reload"] };

/** How much of a conversation is fetched at once; older messages are asked for by the button. */
const PHI_THREAD_MESSAGE_WINDOW = 50;

function readThreadId(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Why a window did not arrive, in the three shapes this surface can say anything about. */
type PhiThreadFetchFailure = "notFound" | "generic" | "network";

type PhiThreadFetchResult =
  | { ok: true; detail: PhisThreadDetail }
  | { ok: false; failure: PhiThreadFetchFailure };

/**
 * One window of a conversation, returned rather than written into state.
 *
 * A plain function and not a hook, so each of the three callers -- opening one, reloading after
 * somebody wrote, reaching further back -- decides for itself what to do with the answer. It is also
 * what lets the open path live inside its own effect with an `AbortController`, which is how this
 * package fetches on mount everywhere else.
 */
async function fetchPhiThreadDetail(
  threadId: number,
  options: { beforeMessageId?: number; signal?: AbortSignal } = {},
): Promise<PhiThreadFetchResult> {
  const query = new URLSearchParams({ messageLimit: String(PHI_THREAD_MESSAGE_WINDOW) });
  if (options.beforeMessageId != null) {
    query.set("beforeMessageId", String(options.beforeMessageId));
  }
  try {
    const response = await fetch(`/api/site/threads/${threadId}?${query.toString()}`, {
      cache: "no-store",
      signal: options.signal,
    });
    if (response.status === 404) {
      // Absent and out of reach are one answer, as the route gives them: telling them apart would say
      // whether a conversation this person cannot see exists.
      return { ok: false, failure: "notFound" };
    }
    if (!response.ok) {
      return { ok: false, failure: "generic" };
    }
    const payload = await response.json() as { thread: PhisThreadDetail };
    return { ok: true, detail: payload.thread };
  } catch {
    return { ok: false, failure: "network" };
  }
}

function readFailureText(failure: PhiThreadFetchFailure, labels: PhiThreadConversationLabels) {
  if (failure === "notFound") {
    return labels.feedback.errorNotFound;
  }
  return failure === "network" ? labels.feedback.errorNetwork : labels.feedback.errorGeneric;
}

export function PhiThreadConversationWidgetClient({
  runtime,
  labels,
  config,
}: PhiThreadConversationWidgetClientProps) {
  const searchParams = useSearchParams();
  const dispatchSignal = usePhiSignalDispatcher();

  const addressedThreadId = readThreadId(searchParams.get("thread"));
  const [threadId, setThreadId] = useState<number | null>(addressedThreadId);
  /*
   * What loaded, and what failed, each tagged with the conversation it belongs to.
   *
   * Derived rather than cleared, and that is the whole reason for the tag. A bare `detail` keeps the
   * previous conversation on screen under the next one's heading until the fetch returns -- and the
   * announcement below reads what is open, so the widget would spend that window telling the composer
   * to write into the conversation just left. Clearing it when the selection changes is the obvious fix
   * and is a cascading render; comparing ids costs nothing and cannot be forgotten at a second caller.
   *
   * There is no loading flag beside them. The four states a reader can be in are already complete:
   * nothing chosen, one that failed, one still on its way -- nothing loaded and nothing failed -- and
   * one to read.
   */
  const [loadedThread, setLoadedThread] =
    useState<{ id: number; detail: PhisThreadDetail } | null>(null);
  const [failedThread, setFailedThread] = useState<{ id: number; message: string } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const detail = loadedThread?.id === threadId ? loadedThread.detail : null;
  const error = failedThread?.id === threadId ? failedThread.message : null;

  /*
   * The last conversation everybody on this page already knows about.
   *
   * Whoever broadcast a selection told every listener at once, so re-announcing it would be an echo --
   * and an echo on a channel this widget also listens to is a loop. What is announced below is only a
   * conversation this widget opened by itself, which is the case the address carries.
   */
  const announcedThreadId = useRef<number | null>(null);

  usePhiSignalListener(
    useCallback((signal: { value: unknown }) => {
      const next = readThreadId(signal.value);
      announcedThreadId.current = next;
      setThreadId(next);
    }, []),
    PHI_THREAD_SELECTION_FILTER,
  );

  const receive = useCallback((id: number, result: PhiThreadFetchResult) => {
    if (result.ok) {
      setLoadedThread({ id, detail: result.detail });
      setFailedThread(null);
      return;
    }
    setFailedThread({ id, message: readFailureText(result.failure, labels) });
  }, [labels]);

  useEffect(() => {
    if (threadId == null) {
      return;
    }
    /*
     * Aborted when the selection moves on.
     *
     * The tag on the state already keeps a late answer from being shown under the wrong heading, so
     * this is not what makes it correct -- it is what keeps somebody clicking down a list from leaving
     * a queue of requests behind them, each still on its way to being thrown away.
     */
    const controller = new AbortController();
    async function open(id: number) {
      const result = await fetchPhiThreadDetail(id, { signal: controller.signal });
      if (!controller.signal.aborted) {
        receive(id, result);
      }
    }
    void open(threadId);
    return () => controller.abort();
  }, [receive, threadId]);

  usePhiSignalListener(
    useCallback((signal: { value: unknown }) => {
      const written = readThreadId(signal.value);
      // Only when it is this conversation: a reload for another one is somebody else's business.
      if (written == null || written !== threadId) {
        return;
      }
      void fetchPhiThreadDetail(written).then((result) => receive(written, result));
    }, [receive, threadId]),
    PHI_THREAD_RELOAD_FILTER,
  );

  const openedThreadId = detail?.thread.id ?? null;

  useEffect(() => {
    /*
     * Announced once it is open, not once it is asked for.
     *
     * A conversation that turned out to be absent or out of reach was never opened, and announcing the
     * id before the answer came back would point the composer at something nobody can write into.
     */
    if (openedThreadId == null || announcedThreadId.current === openedThreadId) {
      return;
    }
    announcedThreadId.current = openedThreadId;
    dispatchSignal({
      scope: "page",
      sender: null,
      receiver: "broadcast",
      channel: "thread",
      action: "change",
      value: openedThreadId,
      valueType: "number",
    });
  }, [dispatchSignal, openedThreadId]);

  const newestMessageId = detail?.messages.at(-1)?.id ?? null;

  useEffect(() => {
    // Read means shown. The marker moves to the newest message actually on screen, so a conversation
    // whose older half is still unfetched does not count as read down to its beginning.
    if (openedThreadId == null || newestMessageId == null) {
      return;
    }
    void fetch(`/api/site/threads/${openedThreadId}/read`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: newestMessageId }),
    }).catch(() => {
      // A marker that did not move is a conversation that still looks unread. Nothing else breaks, and
      // saying so would put an error over a conversation that loaded perfectly well.
    });
  }, [newestMessageId, openedThreadId]);

  const loadOlder = useCallback(async () => {
    const oldest = detail?.messages[0]?.id;
    if (openedThreadId == null || oldest == null) {
      return;
    }
    setLoadingOlder(true);
    try {
      const result = await fetchPhiThreadDetail(openedThreadId, { beforeMessageId: oldest });
      if (!result.ok) {
        setFailedThread({ id: openedThreadId, message: readFailureText(result.failure, labels) });
        return;
      }
      setLoadedThread((current) => current && ({
        id: current.id,
        detail: {
          ...result.detail,
          // The older window's own `hasMoreMessages` is the one that still means something; what is
          // already on screen is kept rather than refetched, so nothing a person is reading moves.
          messages: [...result.detail.messages, ...current.detail.messages],
        },
      }));
    } finally {
      setLoadingOlder(false);
    }
  }, [detail, labels, openedThreadId]);

  const formatTime = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(runtime?.locale?.current ?? undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : formatter.format(parsed);
    };
  }, [runtime]);

  if (threadId == null) {
    return (
      <Typography.Text type="secondary" style={{ padding: config?.padding }}>
        {labels.noThreadText}
      </Typography.Text>
    );
  }

  if (error) {
    return (
      <div style={{ padding: config?.padding }}>
        <PhiAlertControl level="error" title={labels.feedback.errorTitle} description={error} />
      </div>
    );
  }

  if (!detail) {
    return (
      <Typography.Text type="secondary" style={{ padding: config?.padding }}>
        {labels.loadingText}
      </Typography.Text>
    );
  }

  return (
    <Flex vertical gap="large" style={{ padding: config?.padding }}>
      <Flex align="center" gap="small" wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {readThreadTitle(detail, labels)}
        </Typography.Title>
        {detail.thread.status === PhisThreadStatus.Archived ? (
          <PhiTagControl>{labels.archivedLabel}</PhiTagControl>
        ) : null}
      </Flex>

      {detail.hasMoreMessages ? (
        <PhiButtonControl
          label={labels.olderLabel}
          type="link"
          loading={loadingOlder}
          onClick={() => void loadOlder()}
        />
      ) : null}

      {detail.messages.length === 0 ? (
        <Typography.Text type="secondary">{labels.emptyText}</Typography.Text>
      ) : (
        <Flex vertical gap="middle">
          {detail.messages.map((message) => (
            <PhiThreadMessageRow
              key={message.id}
              message={message}
              labels={labels}
              formatTime={formatTime}
            />
          ))}
        </Flex>
      )}

    </Flex>
  );
}

/**
 * What to call this conversation.
 *
 * A subject where there is one -- a ticket and a group thread both carry one. A direct message does
 * not, and heading every one of them "Conversation" would make a list of them unreadable, so who it is
 * with is the name: that is what a person would have called it anyway.
 *
 * A group participates as a group, so its name is what appears rather than its members -- which is also
 * what it means for someone joining the group tomorrow to be in the conversation.
 */
function readThreadTitle(detail: PhisThreadDetail, labels: PhiThreadConversationLabels) {
  const subject = detail.thread.subject?.trim();
  if (subject) {
    return subject;
  }
  const names = detail.participants
    .map((participant) => participant.kind === "group"
      ? participant.name
      : participant.user.displayName ?? labels.unnamedAuthorLabel)
    .filter((name) => name.length > 0);
  return names.length > 0 ? names.join(", ") : labels.subjectFallback;
}

function readAuthorName(
  author: PhisThreadMessage["author"],
  labels: PhiThreadConversationLabels,
) {
  if (author.kind === "user") {
    return author.user.displayName ?? labels.unnamedAuthorLabel;
  }
  if (author.kind === "integration") {
    /*
     * The outside name, with the provider shown beside it rather than woven into a sentence.
     *
     * An integration is not dressed up as a person: what is relayed says whose words these were and
     * which system they came through, and keeping the two apart avoids composing "X on Y" in a word
     * order that only holds in English.
     */
    return author.externalName ?? author.providerId;
  }
  return labels.systemAuthorLabel;
}

function PhiThreadMessageRow({
  message,
  labels,
  formatTime,
}: {
  message: PhisThreadMessage;
  labels: PhiThreadConversationLabels;
  formatTime: (value: string) => string;
}) {
  const internal = (message.flags & PhisThreadMessageFlag.Internal) !== 0;
  const redacted = (message.flags & PhisThreadMessageFlag.Redacted) !== 0;

  return (
    <Flex vertical gap={4}>
      <Flex align="center" gap="small" wrap>
        <Typography.Text strong>{readAuthorName(message.author, labels)}</Typography.Text>
        {message.author.kind === "integration" ? (
          <PhiTagControl>{message.author.providerId}</PhiTagControl>
        ) : null}
        {/* On the message, because which of the two a note is must never be in doubt while writing. */}
        {internal ? <PhiTagControl color="orange">{labels.internalLabel}</PhiTagControl> : null}
        <Typography.Text type="secondary">{formatTime(message.createdAt)}</Typography.Text>
      </Flex>

      {message.bodyText == null ? (
        <Typography.Text type="secondary" italic>
          {redacted ? labels.redactedText : labels.withheldText}
        </Typography.Text>
      ) : (
        // `white-space: pre-wrap` so the line breaks somebody typed are the ones they see back.
        <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {message.bodyText}
        </Typography.Paragraph>
      )}

      {message.assets.length > 0 ? (
        <Flex wrap gap="small">
          {message.assets.map((asset) => (
            /*
             * The address the message carries, and the only one there is.
             *
             * An attachment has no address of its own -- its delivery policy is `Internal` -- so this
             * href is the message saying who may read it. A new tab opens it without losing the
             * conversation underneath.
             */
            <PhiButtonControl
              key={asset.assetId}
              label={asset.fileName}
              type="link"
              href={asset.href}
              newTab
            />
          ))}
        </Flex>
      ) : null}
    </Flex>
  );
}
