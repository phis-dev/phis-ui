"use client";

import { useCallback, useMemo, useState } from "react";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PhiFileDropControl } from "../../../../../components/controls/phi-file-drop-control";
import { PhiProgressControl } from "../../../../../components/controls/phi-progress-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { usePhiMediaUpload } from "../../../../../components/media/phi-media-upload";
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
  type PhiThreadWidgetConfig,
} from "../thread-widget-config";
import { PHI_THREADS_USER_SPACE_MEDIA_KINDS } from "../../media-spaces";
import type { PhiThreadComposerLabels } from "../../../../../components/widgets/label-sets/threads";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

type PhiThreadComposerRuntime = Pick<PhiBlockRuntime, "site" | "locale" | "viewer">;

/**
 * `runtime` is required here, unlike the shared client base.
 *
 * The composer is reached through its server half and nowhere else -- the Builder shows a placeholder
 * instead -- and that half refuses to render without an authenticated viewer. Leaving the slice
 * optional would only buy optional chaining and an invented default for the Site's own locales, which
 * is exactly the guess the language picker exists to avoid.
 */
export type PhiThreadComposerWidgetClientProps = PhiClientBlockBaseProps<
  PhiThreadComposerLabels,
  PhiThreadWidgetConfig,
  PhiThreadComposerRuntime
> & { runtime: PhiThreadComposerRuntime };

/**
 * Writes a message into the selected conversation, with files from the viewer's own Space.
 *
 * It holds no conversation of its own. Which one it writes into arrives on the `thread` channel, so
 * this sits beside whatever lists or shows conversations without either knowing the other's shape --
 * and a Module that shows its own kind of conversation reuses this rather than writing a second
 * composer that would drift from it.
 *
 * Accept, transport, progress and refusal come from the shared upload hook every Media surface uses.
 * What stays here is the part that is about messages: the file is uploaded into the person's own Space
 * first, and the message then names it. That order is what makes an attachment a record before it is a
 * claim -- and it is also why a half-written message that is abandoned leaves files behind in the
 * person's own Space rather than nowhere.
 */
export function PhiThreadComposerWidgetClient({
  runtime,
  labels,
  config,
}: PhiThreadComposerWidgetClientProps) {
  const identity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter();
  const [threadId, setThreadId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  /*
   * What the writer says they are writing in, and never what the interface guessed.
   *
   * A person with a German interface answering an English customer in English is the case the field
   * exists for, so taking `locale.current` silently would be wrong exactly where it matters. The
   * preselection is their own stored preference where the Site has it, the Site default otherwise --
   * a starting point they can change, not an answer given on their behalf.
   *
   * It survives a change of conversation on purpose: the language belongs to the person writing, while
   * the text belongs to the thread and is cleared with it.
   */
  const [sourceLang, setSourceLang] = useState(() => {
    const preferred = runtime.viewer.preferredLocale;
    const offered = runtime.site.availableLocales.some((locale) => locale.code === preferred);
    return offered && preferred ? preferred : runtime.site.defaultLocale;
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listenRoutes = config?.signalRoutes?.listens;

  usePhiSignalListener(
    useCallback((signal) => {
      if (signal.receiver !== identity.receiver && signal.receiver !== "broadcast") {
        return;
      }
      const route = findPhiThreadListenRoute(listenRoutes, signal);
      if (route?.capabilityId !== "select") {
        return;
      }
      setThreadId(readPhiThreadSignalValue(signal.value)?.threadId ?? null);
      // A different conversation is a different message. Carrying the text across would put somebody's
      // half-written reply under a heading they did not choose.
      setMessage("");
      setError(null);
    }, [identity.receiver, listenRoutes]),
    useMemo(() => buildPhiThreadListenFilter(listenRoutes, identity.receiver), [identity.receiver, listenRoutes]),
    // Named here and not only inside the filter: this is what tells the bus somebody answers for the
    // address, and a signal sent to an address nobody answers for is held rather than refused.
    identity.receiver,
  );

  const uploadLabels = useMemo(() => ({
    errorGeneric: labels.feedback.errorGeneric,
    errorNetwork: labels.feedback.errorNetwork,
    errorTooLarge: labels.feedback.errorTooLarge,
    errorDuplicate: labels.feedback.errorDuplicate,
    errorTypeNotAllowed: labels.feedback.errorTypeNotAllowed,
    errorQuotaExceeded: labels.feedback.errorQuotaExceeded,
    errorSpaceUnavailable: labels.feedback.errorSpaceUnavailable,
    errorStorageUnreachable: labels.feedback.errorStorageUnreachable,
  }), [labels]);

  const { accept, items, upload, reset } = usePhiMediaUpload({
    labels: uploadLabels,
    /*
     * The Module's own declaration, read rather than restated.
     *
     * The same value reaches the control plane through the Area preset and decides the upload there, so
     * the file dialog and the answer cannot drift apart. This is the courtesy half; the server is what
     * actually refuses.
     */
    acceptance: {
      kinds: PHI_THREADS_USER_SPACE_MEDIA_KINDS,
      multiple: true,
    },
    // Their own Space and nowhere else: custody follows the uploader, and it is the only place on the
    // Site a person may write.
    initOptions: { spaceAddress: "user" },
    onRejected: (reason) => setError(reason),
  });

  /**
   * What this composer says after a message landed, to whoever the Site wired it to.
   *
   * Nothing is sent when nothing is wired, which is the honest behaviour for a Widget placed on its
   * own: there is no conversation beside it that would need telling.
   */
  const emitWritten = useCallback((id: number) => {
    for (const route of findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.emits, "written")) {
      if (route.receiver == null) {
        continue;
      }
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : { threadId: id },
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
      });
    }
  }, [config?.signalRoutes?.emits, emitSignal]);

  /*
   * The Site's own locales, and deliberately not what the translator can do.
   *
   * What a provider supports decides what is offered at translation time; it never decides what may be
   * recorded. A provider is swapped and a language leaves its list, and the message stays written in
   * what it was written in.
   */
  const languageOptions = useMemo(
    () => runtime.site.availableLocales.map((locale) => ({ value: locale.code, label: locale.label })),
    [runtime.site.availableLocales],
  );

  const attached = items.filter((item) => item.status === "done" && item.assetId != null);
  const uploading = items.filter((item) => item.status === "uploading");
  const canSend = threadId != null && message.trim().length > 0 && uploading.length === 0 && !sending;

  const send = useCallback(async () => {
    if (threadId == null || !message.trim()) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/site/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          messageSourceLang: sourceLang,
          assetIds: attached.map((item) => item.assetId),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error ?? labels.feedback.errorGeneric);
        return;
      }
      setMessage("");
      // The files are the message's now; what the composer holds is only the list it offered.
      reset();
      /*
       * Said out loud, because a conversation that does not show what you just wrote looks broken.
       *
       * `reload` and not `change`: the conversation is the same one, only its contents moved. A
       * `change` would put every listener through switching threads -- and this composer is one of
       * them, so it would clear the next message somebody had already started.
       */
      emitWritten(threadId);
    } catch {
      setError(labels.feedback.errorNetwork);
    } finally {
      setSending(false);
    }
  }, [attached, emitWritten, labels, message, reset, sourceLang, threadId]);

  if (threadId == null) {
    return (
      <PhiTypographyControl type="secondary" style={{ padding: config?.padding }}>
        {labels.noThreadText}
      </PhiTypographyControl>
    );
  }

  return (
    <PhiFlexControl vertical gap="small" style={{ padding: config?.padding }}>
      {error ? (
        <PhiAlertControl level="error" title={labels.feedback.errorTitle} description={error} />
      ) : null}
      <PhiTextControl
        presentation="textarea"
        value={message}
        onChange={(next) => setMessage(next ?? "")}
        placeholder={labels.messagePlaceholder}
        autoSize={{ minRows: 3, maxRows: 12 }}
        disabled={sending}
      />
      {attached.length > 0 ? (
        <PhiFlexControl wrap gap="small">
          {attached.map((item) => (
            <PhiTagControl key={item.localId}>{item.file.name}</PhiTagControl>
          ))}
        </PhiFlexControl>
      ) : null}
      {uploading.map((item) => (
        <PhiProgressControl key={item.localId} percent={Math.round(item.progress)} size="small" />
      ))}
      <PhiFlexControl justify="space-between" align="center" gap="small">
        <PhiFileDropControl
          accept={accept}
          multiple
          disabled={sending}
          onFile={(file) => void upload(file)}
        >
          {/*
            * The click belongs to the uploader wrapped around it, which opens the file dialog. The
            * empty handler is what says this button is live: a Button with none is disabled on
            * purpose, and this one is not.
            */}
          <PhiButtonControl label={labels.attachLabel} disabled={sending} onClick={() => {}} />
        </PhiFileDropControl>
        <PhiSelectControl
          value={sourceLang}
          options={languageOptions}
          ariaLabel={labels.languageLabel}
          size="small"
          disabled={sending}
          onChange={(next) => setSourceLang(next ?? runtime.site.defaultLocale)}
        />
        <PhiButtonControl
          label={labels.sendLabel}
          type="primary"
          loading={sending}
          disabled={!canSend}
          onClick={() => void send()}
        />
      </PhiFlexControl>
      <PhiTypographyControl type="secondary">{labels.attachHint}</PhiTypographyControl>
      <PhiTypographyControl type="secondary">{labels.languageHint}</PhiTypographyControl>
    </PhiFlexControl>
  );
}
