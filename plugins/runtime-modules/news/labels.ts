import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiContentEntryKindEditorLabels } from "../../../components/regions/presets/content-entry-editor-page-tree";
import { PHI_NEWS_RUNTIME_MODULE_IDENTITY } from "./ids";

/**
 * The words that are News's own; everything the entries surface says besides is the shared Label Set
 * (`CONTENT_ENTRIES.md`).
 */
const PHI_NEWS_KIND_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_NEWS_RUNTIME_MODULE_IDENTITY, {
  key: "preset:editor-news-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    widget_label: "news entries",
    entry_title: "News entry",
    create_title: "New news entry",
    empty_title: definePhiMessageLabel("No news entries yet."),
  },
});

export async function getPhiNewsKindLabels(options: PhiGlobalTranslatorOptions): Promise<PhiContentEntryKindEditorLabels> {
  const labels = await getPhiLabelSet(options, PHI_NEWS_KIND_LABEL_SET);
  return {
    widgetLabel: labels.widget_label,
    entryTitle: labels.entry_title,
    createTitle: labels.create_title,
    emptyTitle: labels.empty_title,
  };
}
