import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the News table says, wherever a Site places it.
 *
 * The words of the surface, not of the entries: an entry's own title arrives from Core in the Site's
 * source language, because this is where it is written rather than read.
 */
const PHI_EDITOR_NEWS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:editor-news",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    search_placeholder: "Search address or title",
    status_label: "Status",
    status_all: "All",
    status_draft: "Draft",
    status_published: "Published",
    row_draft: "Draft",
    row_published: "Published",
    column_title: "Title",
    column_slug: "Address",
    column_status: "Status",
    column_language: "Written in",
    column_tags: "Tags",
    column_published: "Published",
    column_expires: "Expires",
    column_changed: "Changed",
    action_withdraw: "Withdraw",
    action_delete: "Delete",
    withdraw_title: "Withdraw this entry",
    withdraw_description: definePhiMessageLabel(
      "The entry stops being answered and keeps its words. Publishing it again is one press.",
    ),
    delete_title: "Delete this entry",
    delete_description: definePhiMessageLabel(
      "Its words and every version of them are removed. A published entry has to be withdrawn first.",
    ),
    empty_title: definePhiMessageLabel("No news entries yet."),
    empty_text: definePhiMessageLabel("Nothing has been written here, or nothing matches the filter."),
  },
});

export type PhiEditorNewsWidgetLabels = {
  searchPlaceholder: string;
  statusLabel: string;
  statuses: { all: string; draft: string; published: string };
  rowStatus: { draft: string; published: string };
  columns: {
    title: string;
    slug: string;
    status: string;
    language: string;
    tags: string;
    published: string;
    expires: string;
    changed: string;
  };
  actions: { withdraw: string; delete: string };
  withdraw: { title: string; description: string };
  delete: { title: string; description: string };
  empty: { title: string; text: string };
};

export async function getPhiEditorNewsWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiEditorNewsWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_NEWS_WIDGET_LABEL_SET);
  return {
    searchPlaceholder: labels.search_placeholder,
    statusLabel: labels.status_label,
    statuses: { all: labels.status_all, draft: labels.status_draft, published: labels.status_published },
    rowStatus: { draft: labels.row_draft, published: labels.row_published },
    columns: {
      title: labels.column_title,
      slug: labels.column_slug,
      status: labels.column_status,
      language: labels.column_language,
      tags: labels.column_tags,
      published: labels.column_published,
      expires: labels.column_expires,
      changed: labels.column_changed,
    },
    actions: { withdraw: labels.action_withdraw, delete: labels.action_delete },
    withdraw: { title: labels.withdraw_title, description: labels.withdraw_description },
    delete: { title: labels.delete_title, description: labels.delete_description },
    empty: { title: labels.empty_title, text: labels.empty_text },
  };
}
