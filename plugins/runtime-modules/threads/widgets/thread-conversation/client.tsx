"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import type { PhisThreadDetail, PhisThreadMessage } from "../../../../../types/threads";
import { PhisThreadMessageFlag, PhisThreadStatus } from "../../../../../constants/threads";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import {
  usePhiSignalEmitter,
  usePhiSignalIdentity,
} from "../../../../../components/runtime/runtime-signal-identity";
import { findPhiSignalRoutesByCapabilityId } from "../../../../../types/signals";
import { readPhiThreadSignalValue } from "../../../../../types/thread-widget";
import {
  buildPhiThreadListenFilter,
  findPhiThreadListenRoute,
  readPhiThreadAddressId,
  type PhiThreadWidgetConfig,
} from "../thread-widget-config";
import type { PhiThreadConversationLabels } from "../../../../../components/widgets/label-sets/threads";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

export type PhiThreadConversationWidgetClientProps = PhiClientBlockBaseProps<
  PhiThreadConversationLabels,
  PhiThreadWidgetConfig,
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

/** How much of a conversation is fetched at once; older messages are asked for by the button. */
const PHI_THREAD_MESSAGE_WINDOW = 50;

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

/**
 * What this installation is willing to translate into, for this Site.
 *
 * Asked once and never derived: the mode, the key and the selected Provider are installation state no
 * Site is shown, so a surface that guessed would draw a control that answers 409. `available: false` is a
 * control that must not exist, not an empty one.
 */
type PhiThreadTranslationOffer = {
  available: boolean;
  targetLocales: readonly string[];
};

async function fetchPhiTranslationOffer(signal?: AbortSignal) {
  try {
    const response = await fetch("/api/site/translation", { cache: "no-store", signal });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json() as { translation: PhiThreadTranslationOffer };
    return payload.translation ?? null;
  } catch {
    // Not knowing is the same as not offered: nothing is drawn, and nothing claims an outage on a
    // conversation that loaded perfectly well.
    return null;
  }
}

/**
 * What became of one message's translation.
 *
 * `visible` is on the ready entry rather than in a set of its own, because "show the original" is the
 * same control and not a second feature -- pressing it back must not throw away what was already paid
 * for. Keyed by message id, which is unique across threads, so switching conversations and returning
 * does not ask again. The Area ending unmounts this and with it the whole cache.
 */
type PhiMessageTranslation =
  | { status: "pending" }
  | { status: "failed" }
  | { status: "ready"; text: string; sourceLocale: string | null; visible: boolean };

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
  const { token } = usePhiConfig();
  const searchParams = useSearchParams();
  const identity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter();

  const listenRoutes = config?.signalRoutes?.listens;
  const addressedThreadId = readPhiThreadAddressId(searchParams.get("thread"));
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
  /*
   * The one language the control offers, or null for no control.
   *
   * **The language this account set as its own** -- `viewer.preferredLocale` -- and the locale the surface
   * is rendered in only where nobody has set one, because then there is no "own" language to use.
   *
   * There is no picker, and the reason is the bill. Every press is a translation that is paid for by the
   * length of the text sent, whether or not anybody reads the answer: a dropdown beside every message
   * invites trying a second and a third language on the same paragraph to see which reads better, and
   * each of those is charged in full. One language per person, set once in their own settings, is the
   * same control with nothing to try out. Somebody who wants to read in another language changes their
   * own, which is a deliberate act in one place rather than an idle one in every row.
   *
   * Null until the offer has answered, and null afterwards where this installation cannot produce that
   * language -- which is why the button is absent rather than disabled: a control that cannot work is not
   * a control.
   */
  const [translationTarget, setTranslationTarget] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<number, PhiMessageTranslation>>({});

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

  const readingLocale =
    runtime?.viewer?.preferredLocale?.trim() || runtime?.locale?.current?.trim() || "";

  useEffect(() => {
    if (!readingLocale) {
      return;
    }
    const controller = new AbortController();
    void fetchPhiTranslationOffer(controller.signal).then((offer) => {
      if (controller.signal.aborted) {
        return;
      }
      setTranslationTarget(
        offer?.available && offer.targetLocales.includes(readingLocale) ? readingLocale : null,
      );
    });
    return () => controller.abort();
  }, [readingLocale]);

  /*
   * One listener for both capabilities, because both arrive on the same wiring.
   *
   * Which one it is, is the route's `capabilityId` and not the channel: a Site may wire `select` to a
   * listing beside this and `reload` to the composer beneath it, or point both at something else
   * entirely, and this reads the same either way.
   */
  usePhiSignalListener(
    useCallback((signal) => {
      if (signal.receiver !== identity.receiver && signal.receiver !== "broadcast") {
        return;
      }
      const route = findPhiThreadListenRoute(listenRoutes, signal);
      if (route?.capabilityId === "select") {
        const next = readPhiThreadSignalValue(signal.value)?.threadId ?? null;
        announcedThreadId.current = next;
        setThreadId(next);
        return;
      }
      if (route?.capabilityId !== "reload") {
        return;
      }
      const written = readPhiThreadSignalValue(signal.value)?.threadId ?? null;
      // Only when it is this conversation: a reload for another one is somebody else's business.
      if (written == null || written !== threadId) {
        return;
      }
      void fetchPhiThreadDetail(written).then((result) => receive(written, result));
    }, [identity.receiver, listenRoutes, receive, threadId]),
    useMemo(() => buildPhiThreadListenFilter(listenRoutes, identity.receiver), [identity.receiver, listenRoutes]),
    // Named here and not only inside the filter: this is what tells the bus somebody answers for the
    // address, and a signal sent to an address nobody answers for is held rather than refused.
    identity.receiver,
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
    for (const route of findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.emits, "opened")) {
      if (route.receiver == null) {
        continue;
      }
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : { threadId: openedThreadId },
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
      });
    }
  }, [config?.signalRoutes?.emits, emitSignal, openedThreadId]);

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

  /**
   * One message, one round trip, and nothing kept anywhere but here.
   *
   * Core translates rather than this surface, because the body lives there and `Confidential` says it may
   * not leave it -- fetching the body and posting it to a provider from a browser would have moved it out
   * before any rule could apply. What comes back is held in memory for as long as this is mounted and is
   * never stored: the original is the only version of a message that exists.
   */
  const translate = useCallback(async (messageId: number) => {
    if (openedThreadId == null || translationTarget == null) {
      return;
    }
    const existing = translations[messageId];
    if (existing?.status === "pending") {
      return;
    }
    if (existing?.status === "ready") {
      // The same control, pressed back. Nothing is asked again for something already paid for.
      setTranslations((current) => ({
        ...current,
        [messageId]: { ...existing, visible: !existing.visible },
      }));
      return;
    }
    setTranslations((current) => ({ ...current, [messageId]: { status: "pending" } }));
    const fail = () => setTranslations((current) => ({ ...current, [messageId]: { status: "failed" } }));
    try {
      const response = await fetch(
        `/api/site/threads/${openedThreadId}/messages/${messageId}/translate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: translationTarget }),
        },
      );
      if (!response.ok) {
        fail();
        return;
      }
      const payload = await response.json() as {
        translation?: { text?: string; sourceLocale?: string | null };
      };
      const text = payload.translation?.text ?? "";
      if (!text) {
        fail();
        return;
      }
      setTranslations((current) => ({
        ...current,
        [messageId]: {
          status: "ready",
          text,
          sourceLocale: payload.translation?.sourceLocale ?? null,
          visible: true,
        },
      }));
    } catch {
      fail();
    }
  }, [openedThreadId, translationTarget, translations]);

  /**
   * A language's own name, in the language of whoever is reading.
   *
   * The provider answers with a locale key, and a key is not something to show somebody. Null where the
   * platform cannot name it or nothing was detected -- a translation marked as machine-made is honest
   * without saying what it came out of.
   */
  const formatLanguage = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([readingLocale || "en"], { type: "language" });
    } catch {
      names = null;
    }
    return (locale: string | null) => {
      if (!locale) {
        return null;
      }
      try {
        return names?.of(locale) ?? null;
      } catch {
        return null;
      }
    };
  }, [readingLocale]);

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

  /*
   * The box this Widget is, drawn from the Theme and worn in every state.
   *
   * A conversation is a panel on a page: it has a frame and it sits on the panel background, and both
   * come from the Theme rather than from colours typed in here -- `colorBgContainer` is what a panel
   * stands on and `colorBorderSecondary` is the quiet frame, the same pair the Card Widget uses.
   *
   * All four states wear it, including "nothing chosen" and "still loading". A frame that appears only
   * once a conversation has arrived is a page that jumps when somebody clicks a row, and the empty state
   * is the one a person looks at longest.
   *
   * The configured padding wins where a Site set one, and the Theme's own `padding` stands in where none
   * is set: a frame drawn tight against the text would be the Theme's spacing scale ignored at the one
   * place it became visible.
   */
  const panelStyle = {
    padding: config?.padding ?? token.padding,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  };

  if (threadId == null) {
    return (
      <div style={panelStyle}>
        <PhiTypographyControl type="secondary">{labels.noThreadText}</PhiTypographyControl>
      </div>
    );
  }

  if (error) {
    return (
      <div style={panelStyle}>
        <PhiAlertControl level="error" title={labels.feedback.errorTitle} description={error} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={panelStyle}>
        <PhiTypographyControl type="secondary">{labels.loadingText}</PhiTypographyControl>
      </div>
    );
  }

  return (
    <PhiFlexControl vertical gap="large" style={panelStyle}>
      <PhiFlexControl align="center" gap="small" wrap>
        <PhiTypographyControl presentation="title" level={4} style={{ margin: 0 }}>
          {readThreadTitle(detail, labels)}
        </PhiTypographyControl>
        {detail.thread.status === PhisThreadStatus.Archived ? (
          <PhiTagControl>{labels.archivedLabel}</PhiTagControl>
        ) : null}
      </PhiFlexControl>

      {detail.hasMoreMessages ? (
        <PhiButtonControl
          label={labels.olderLabel}
          type="link"
          loading={loadingOlder}
          onClick={() => void loadOlder()}
        />
      ) : null}

      {detail.messages.length === 0 ? (
        <PhiTypographyControl type="secondary">{labels.emptyText}</PhiTypographyControl>
      ) : (
        <PhiFlexControl vertical gap="middle">
          {detail.messages.map((message) => (
            <PhiThreadMessageRow
              key={message.id}
              message={message}
              labels={labels}
              formatTime={formatTime}
              formatLanguage={formatLanguage}
              translation={translations[message.id] ?? null}
              canTranslate={translationTarget != null}
              onTranslate={translate}
            />
          ))}
        </PhiFlexControl>
      )}

    </PhiFlexControl>
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
  formatLanguage,
  translation,
  canTranslate,
  onTranslate,
}: {
  message: PhisThreadMessage;
  labels: PhiThreadConversationLabels;
  formatTime: (value: string) => string;
  formatLanguage: (locale: string | null) => string | null;
  translation: PhiMessageTranslation | null;
  canTranslate: boolean;
  onTranslate: (messageId: number) => void;
}) {
  const internal = (message.flags & PhisThreadMessageFlag.Internal) !== 0;
  const redacted = (message.flags & PhisThreadMessageFlag.Redacted) !== 0;
  /*
   * `Confidential` gets no control, and the route would refuse it anyway.
   *
   * It is the one flag about where a body may go rather than who may read it, and a translation is the
   * body leaving Core. Whoever may read this message still may not have it translated, so the button is
   * absent rather than there to be refused.
   */
  const confidential = (message.flags & PhisThreadMessageFlag.Confidential) !== 0;
  const shown = translation?.status === "ready" && translation.visible ? translation : null;
  const offerTranslation = canTranslate && !confidential && message.bodyText != null;

  return (
    <PhiFlexControl vertical gap={4}>
      <PhiFlexControl align="center" gap="small" wrap>
        <PhiTypographyControl strong>{readAuthorName(message.author, labels)}</PhiTypographyControl>
        {message.author.kind === "integration" ? (
          <PhiTagControl>{message.author.providerId}</PhiTagControl>
        ) : null}
        {/* On the message, because which of the two a note is must never be in doubt while writing. */}
        {internal ? <PhiTagControl color="orange">{labels.internalLabel}</PhiTagControl> : null}
        <PhiTypographyControl type="secondary">{formatTime(message.createdAt)}</PhiTypographyControl>
        {/*
          * Beside the time, because that is where a message says what it is rather than what it says.
          *
          * The author, the markers and the timestamp are already one line about the message; reading it
          * in another language is the same kind of fact and belongs in the same line. Under the body it
          * sat between one message and the next, where a row of buttons reads as the conversation's
          * furniture instead of as this message's.
          */}
        {offerTranslation ? (
          <PhiButtonControl
            label={shown ? labels.originalLabel : labels.translateLabel}
            type="link"
            size="small"
            loading={translation?.status === "pending"}
            onClick={() => onTranslate(message.id)}
          />
        ) : null}
      </PhiFlexControl>

      {message.bodyText == null ? (
        <PhiTypographyControl type="secondary" italic>
          {redacted ? labels.redactedText : labels.withheldText}
        </PhiTypographyControl>
      ) : (
        // `white-space: pre-wrap` so the line breaks somebody typed are the ones they see back.
        <PhiTypographyControl presentation="paragraph" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {shown ? shown.text : message.bodyText}
        </PhiTypographyControl>
      )}

      {shown ? (
        <PhiFlexControl align="center" gap="small" wrap>
          {/* Marked, because unmarked it reads as what the person wrote. */}
          <PhiTagControl color="blue">{labels.machineTranslationLabel}</PhiTagControl>
          {formatLanguage(shown.sourceLocale) ? (
            <PhiTagControl>{formatLanguage(shown.sourceLocale)}</PhiTagControl>
          ) : null}
        </PhiFlexControl>
      ) : null}

      {translation?.status === "failed" ? (
        <PhiTypographyControl type="secondary">
          {labels.feedback.errorTranslation}
        </PhiTypographyControl>
      ) : null}


      {message.assets.length > 0 ? (
        <PhiFlexControl wrap gap="small">
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
        </PhiFlexControl>
      ) : null}
    </PhiFlexControl>
  );
}
