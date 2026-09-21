"use client";

import { useEffect, useMemo, useState } from "react";

import { PhisThreadKind, PhisSiteThreadKindFlag } from "../../../../constants/threads";
import { PhiAlertControl } from "../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../components/controls/phi-button-control";
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiMultiSelectControl } from "../../../../components/controls/phi-multi-select-control";
import { PhiSelectControl } from "../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../components/controls/phi-text-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";
import { fetchPhiThreadCandidates, type PhiThreadCandidates, type PhiThreadDraft } from "./collection";

export type PhiNewConversationLabels = {
  peopleKindLabel: string;
  groupKindLabel: string;
  peopleLabel: string;
  peoplePlaceholder: string;
  groupLabel: string;
  groupPlaceholder: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  openLabel: string;
  cancelLabel: string;
  loadingText: string;
  noKindsText: string;
  errorTitle: string;
};

/**
 * Opening a conversation, which is choosing who it is with and saying the first thing.
 *
 * The two are one step because the Core route makes them one: a conversation is created with its
 * opening message, and there is no moment in between where an empty thread exists for somebody to find.
 * So this is not only a picker, and calling it one would have led to a second screen that cannot exist.
 *
 * The kind is chosen, not derived. Selecting people could have meant `Direct` and selecting a group
 * `Group`, but the two differ in who may read it afterwards -- a group conversation is open to whoever
 * joins the group later -- and that is not something to infer from which box somebody filled in.
 */
export function PhiNewConversationPanel({
  labels,
  busy,
  onCancel,
  onSubmit,
}: {
  labels: PhiNewConversationLabels;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (draft: PhiThreadDraft) => void;
}) {
  const [candidates, setCandidates] = useState<PhiThreadCandidates | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kind, setKind] = useState<number | null>(null);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const abortController = new AbortController();
    fetchPhiThreadCandidates(abortController.signal)
      .then((next) => {
        if (abortController.signal.aborted) return;
        setCandidates(next);
        // Whatever the Site actually offers, and if it offers one thing there is nothing to choose.
        const direct = (next.kindFlags & PhisSiteThreadKindFlag.Direct) !== 0;
        const group = (next.kindFlags & PhisSiteThreadKindFlag.Group) !== 0;
        setKind(direct ? PhisThreadKind.Direct : group ? PhisThreadKind.Group : null);
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "The candidates could not be loaded.");
      });
    return () => abortController.abort();
  }, []);

  const kindOptions = useMemo(() => {
    const flags = candidates?.kindFlags ?? 0;
    return [
      ...((flags & PhisSiteThreadKindFlag.Direct) !== 0
        ? [{ value: PhisThreadKind.Direct, label: labels.peopleKindLabel }]
        : []),
      ...((flags & PhisSiteThreadKindFlag.Group) !== 0
        ? [{ value: PhisThreadKind.Group, label: labels.groupKindLabel }]
        : []),
    ];
  }, [candidates, labels.groupKindLabel, labels.peopleKindLabel]);

  const userOptions = useMemo(
    () => (candidates?.users ?? []).map((user) => ({
      value: user.userId,
      label: user.displayName ?? String(user.userId),
      description: user.companyName ?? undefined,
    })),
    [candidates],
  );
  const groupOptions = useMemo(
    () => (candidates?.groups ?? []).map((group) => ({ value: group.id, label: group.name })),
    [candidates],
  );

  if (loadError) {
    return <PhiAlertControl level="error" showIcon title={labels.errorTitle} description={loadError} />;
  }
  if (!candidates) {
    return <PhiTypographyControl type="secondary">{labels.loadingText}</PhiTypographyControl>;
  }
  if (kindOptions.length === 0) {
    return <PhiTypographyControl type="secondary">{labels.noKindsText}</PhiTypographyControl>;
  }

  const isGroup = kind === PhisThreadKind.Group;
  const hasParticipants = isGroup ? groupId != null : userIds.length > 0;
  const canSubmit = kind != null && hasParticipants && message.trim().length > 0 && !busy;

  return (
    <PhiFlexControl vertical gap="small">
      {kindOptions.length > 1 ? (
        <PhiSelectControl<number>
          label={labels.peopleKindLabel}
          ariaLabel={labels.peopleKindLabel}
          value={kind ?? undefined}
          options={kindOptions}
          onChange={(next) => {
            setKind(next);
            setUserIds([]);
            setGroupId(null);
          }}
        />
      ) : null}

      {isGroup ? (
        <PhiSelectControl<number>
          label={labels.groupLabel}
          placeholder={labels.groupPlaceholder}
          value={groupId ?? undefined}
          options={groupOptions}
          allowClear
          onChange={(next) => setGroupId(next ?? null)}
        />
      ) : (
        <PhiMultiSelectControl<number>
          label={labels.peopleLabel}
          placeholder={labels.peoplePlaceholder}
          value={userIds}
          options={userOptions}
          onChange={(next) => setUserIds(next)}
        />
      )}

      <PhiTextControl
        label={labels.subjectLabel}
        placeholder={labels.subjectPlaceholder}
        value={subject}
        onChange={(next) => setSubject(next ?? "")}
      />
      <PhiTextControl
        label={labels.messageLabel}
        placeholder={labels.messagePlaceholder}
        presentation="textarea"
        autoSize={{ minRows: 3, maxRows: 8 }}
        value={message}
        onChange={(next) => setMessage(next ?? "")}
      />

      <PhiFlexControl gap="small">
        <PhiButtonControl
          label={labels.openLabel}
          type="primary"
          disabled={!canSubmit}
          loading={busy}
          onClick={() => {
            if (kind == null) return;
            onSubmit({
              kind,
              message: message.trim(),
              subject: subject.trim() || null,
              participantUserIds: isGroup ? [] : userIds,
              participantGroupIds: isGroup && groupId != null ? [groupId] : [],
            });
          }}
        />
        <PhiButtonControl label={labels.cancelLabel} onClick={onCancel} disabled={busy} />
      </PhiFlexControl>
    </PhiFlexControl>
  );
}
