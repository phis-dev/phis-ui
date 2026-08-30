import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS,
  type PhiPageTitleWidgetLabels,
} from "../label-types/page-title";

const PHI_PAGE_TITLE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:page-title",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    editor_placeholder: PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS.editorPlaceholder,
    empty_title: PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS.emptyTitle,
  },
});

export async function getPhiPageTitleWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiPageTitleWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_PAGE_TITLE_WIDGET_LABEL_SET);
  return {
    editorPlaceholder: labels.editor_placeholder,
    emptyTitle: labels.empty_title,
  };
}
