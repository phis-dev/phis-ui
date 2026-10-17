import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_EDITOR_RUNTIME_MODULE_IDENTITY } from "../ids";

/** What the Releases page in the Editor says: its frame, the Table's columns, and its two acts. */
const PHI_EDITOR_RELEASES_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_EDITOR_RUNTIME_MODULE_IDENTITY, {
  key: "preset:editor-releases-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    widget_label: "releases",
    column_kind: "Kind",
    column_what: "What",
    column_where: "Where",
    column_by: "By",
    column_at: "When",
    kind_content: "Content",
    kind_entry: "Entry",
    kind_page: "Page",
    kind_area: "Area",
    action_publish: "Publish",
    action_reject: "Send back",
    publish_title: "Publish this",
    publish_description: definePhiMessageLabel(
      "What was submitted goes live now. Content is published apart from the Page that shows it.",
    ),
    reject_title: "Send this back",
    reject_description: definePhiMessageLabel(
      "The submission is withdrawn and nothing is published. The words stay as they were written.",
    ),
    empty_title: definePhiMessageLabel("Nothing waits for publication."),
    empty_text: definePhiMessageLabel("Submitted content and Page drafts appear here."),
  },
});

export async function getPhiEditorReleasesPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_RELEASES_PAGE_LABEL_SET);
  return {
    widgetLabel: labels.widget_label,
    columns: {
      kind: labels.column_kind,
      what: labels.column_what,
      where: labels.column_where,
      by: labels.column_by,
      at: labels.column_at,
    },
    kinds: {
      content: labels.kind_content,
      entry: labels.kind_entry,
      page: labels.kind_page,
      area: labels.kind_area,
    },
    actions: { publish: labels.action_publish, reject: labels.action_reject },
    publish: { title: labels.publish_title, description: labels.publish_description },
    reject: { title: labels.reject_title, description: labels.reject_description },
    empty: { title: labels.empty_title, text: labels.empty_text },
  };
}
