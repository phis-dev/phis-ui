export type PhiDraftStatusWidgetLabels = {
  checking: string;
  unsaved: string;
  draft: string;
  draftWithRevision: string;
  published: string;
  unavailable: string;
  readFailed: string;
};

export const PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS: PhiDraftStatusWidgetLabels = {
  checking: "Checking...",
  unsaved: "Unsaved",
  draft: "Draft",
  draftWithRevision: "Draft #{revisionId}",
  published: "Published",
  unavailable: "Unavailable",
  readFailed: "Failed to read draft status.",
};

export function formatPhiDraftStatusRevisionLabel(label: string, revisionId: number) {
  return label.replace("{revisionId}", String(revisionId));
}
