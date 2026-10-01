import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS,
  type PhiDraftStatusWidgetLabels,
} from "../label-types/draft-status";

const PHI_DRAFT_STATUS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:draft-status",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    checking: PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.checking,
    unsaved: PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.unsaved,
    draft: PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.draft,
    draft_with_revision: PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.draftWithRevision,
    published: PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.published,
    unavailable: PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.unavailable,
    read_failed: definePhiMessageLabel(PHI_DRAFT_STATUS_WIDGET_DEFAULT_LABELS.readFailed),
  },
});

export async function getPhiDraftStatusWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiDraftStatusWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_DRAFT_STATUS_WIDGET_LABEL_SET);
  return {
    checking: labels.checking,
    unsaved: labels.unsaved,
    draft: labels.draft,
    draftWithRevision: labels.draft_with_revision,
    published: labels.published,
    unavailable: labels.unavailable,
    readFailed: labels.read_failed,
  };
}
