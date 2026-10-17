import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiContentEntryKindEditorLabels } from "../../../components/regions/presets/content-entry-editor-page-tree";
import { PHI_BLOG_RUNTIME_MODULE_IDENTITY } from "./ids";

/**
 * The words that are Blog's own; everything the entries surface says besides is the shared Label Set
 * (`CONTENT_ENTRIES.md`).
 */
const PHI_BLOG_KIND_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BLOG_RUNTIME_MODULE_IDENTITY, {
  key: "preset:editor-blog-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    widget_label: "blog posts",
    entry_title: "Blog post",
    create_title: "New blog post",
    empty_title: definePhiMessageLabel("No blog posts yet."),
  },
});

export async function getPhiBlogKindLabels(options: PhiGlobalTranslatorOptions): Promise<PhiContentEntryKindEditorLabels> {
  const labels = await getPhiLabelSet(options, PHI_BLOG_KIND_LABEL_SET);
  return {
    widgetLabel: labels.widget_label,
    entryTitle: labels.entry_title,
    createTitle: labels.create_title,
    emptyTitle: labels.empty_title,
  };
}
