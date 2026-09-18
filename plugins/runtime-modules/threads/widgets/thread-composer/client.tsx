"use client";

import { useCallback, useMemo, useState } from "react";
import { Flex, Progress, Typography, Upload } from "antd";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { usePhiMediaUpload } from "../../../../../components/media/phi-media-upload";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import type { PhiSignalFilter } from "../../../../../types/signals";
import { PHI_THREADS_RUNTIME_MODULE_DEFINITION } from "../../definition";
import type { PhiThreadComposerLabels } from "../../../../../components/widgets/label-sets/threads";

export type PhiThreadComposerWidgetClientProps = PhiClientBlockBaseProps<
  PhiThreadComposerLabels,
  { padding?: number | string },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

/**
 * What a conversation surface says when the person picks one.
 *
 * `change` rather than a verb of its own: choosing a conversation changes which one is being written
 * in, and the signal vocabulary is deliberately small -- a Module inventing an action for its own case
 * is how two surfaces come to mean the same thing in two words.
 */
const PHI_THREAD_SELECTION_FILTER: PhiSignalFilter = { channels: ["thread"], actions: ["change"] };

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
  labels,
  config,
}: PhiThreadComposerWidgetClientProps) {
  const [threadId, setThreadId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePhiSignalListener(
    useCallback((signal: { value: unknown }) => {
      const value = typeof signal.value === "number" ? signal.value : Number(signal.value);
      setThreadId(Number.isInteger(value) && value > 0 ? value : null);
      // A different conversation is a different message. Carrying the text across would put somebody's
      // half-written reply under a heading they did not choose.
      setMessage("");
      setError(null);
    }, []),
    PHI_THREAD_SELECTION_FILTER,
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
      kinds: PHI_THREADS_RUNTIME_MODULE_DEFINITION.mediaSpaces.user.kinds,
      multiple: true,
    },
    // Their own Space and nowhere else: custody follows the uploader, and it is the only place on the
    // Site a person may write.
    initOptions: { spaceAddress: "user" },
    onRejected: (reason) => setError(reason),
  });

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
    } catch {
      setError(labels.feedback.errorNetwork);
    } finally {
      setSending(false);
    }
  }, [attached, labels, message, reset, threadId]);

  if (threadId == null) {
    return (
      <Typography.Text type="secondary" style={{ padding: config?.padding }}>
        {labels.noThreadText}
      </Typography.Text>
    );
  }

  return (
    <Flex vertical gap="small" style={{ padding: config?.padding }}>
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
        <Flex wrap gap="small">
          {attached.map((item) => (
            <PhiTagControl key={item.localId}>{item.file.name}</PhiTagControl>
          ))}
        </Flex>
      ) : null}
      {uploading.map((item) => (
        <Progress key={item.localId} percent={Math.round(item.progress)} size="small" />
      ))}
      <Flex justify="space-between" align="center" gap="small">
        <Upload
          accept={accept}
          multiple
          showUploadList={false}
          disabled={sending}
          // Never hand the file to Ant Design's own uploader: the transport is the Provider-issued plan.
          beforeUpload={(file) => { void upload(file as File); return false; }}
        >
          {/*
            * The click belongs to the uploader wrapped around it, which opens the file dialog. The
            * empty handler is what says this button is live: a Button with none is disabled on
            * purpose, and this one is not.
            */}
          <PhiButtonControl label={labels.attachLabel} disabled={sending} onClick={() => {}} />
        </Upload>
        <PhiButtonControl
          label={labels.sendLabel}
          type="primary"
          loading={sending}
          disabled={!canSend}
          onClick={() => void send()}
        />
      </Flex>
      <Typography.Text type="secondary">{labels.attachHint}</Typography.Text>
    </Flex>
  );
}
