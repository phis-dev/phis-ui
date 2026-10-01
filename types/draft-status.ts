/**
 * What a Controller says about the draft it holds, on the `draftStatus` channel.
 *
 * The value of `PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus`. Whoever keeps a draft -- the Builder's
 * workspaces, the Theme, a Module's own -- states it in these words, and the Core Draft Status Widget
 * draws them without knowing what the draft is of:
 *
 * - `unsaved`: worked on since the last save; what is on screen is in no stored revision.
 * - `draft`: saved, not published; `revisionId` names the draft revision.
 * - `published`: no draft stands; what is live is what is shown.
 * - `error`: the state could not be read; `error` says why when the sender knows.
 *
 * `subject` is the sender's own name for what the draft is of -- a path, a key -- shown beside the
 * status. Senders may add fields of their own; a reader takes these and ignores the rest.
 */
export type PhiDraftStatus = "unsaved" | "draft" | "published" | "error";

export type PhiDraftStatusSignalValue = {
  status: PhiDraftStatus;
  revisionId: number | null;
  subject?: string | null;
  error?: string | null;
};

function isPhiDraftStatus(value: unknown): value is PhiDraftStatus {
  return value === "unsaved" || value === "draft" || value === "published" || value === "error";
}

export function readPhiDraftStatusSignalValue(value: unknown): PhiDraftStatusSignalValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!isPhiDraftStatus(record.status)) {
    return null;
  }
  return {
    status: record.status,
    revisionId: typeof record.revisionId === "number" && Number.isInteger(record.revisionId)
      ? record.revisionId
      : null,
    subject: typeof record.subject === "string" ? record.subject : null,
    error: typeof record.error === "string" ? record.error : null,
  };
}
