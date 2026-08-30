import "server-only";

import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import {
  PHI_MARKDOWN_TOC_WIDGET_DEFAULT_LABELS,
  type PhiMarkdownTocWidgetDefaultLabels,
} from "../label-types/markdown-toc";

const PHI_MARKDOWN_TOC_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:markdown-toc",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    default_title: PHI_MARKDOWN_TOC_WIDGET_DEFAULT_LABELS.title,
  },
});

export async function getPhiMarkdownTocWidgetDefaultLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiMarkdownTocWidgetDefaultLabels> {
  const labels = await getPhiLabelSet(options, PHI_MARKDOWN_TOC_WIDGET_LABEL_SET);
  return {
    title: labels.default_title,
  };
}
