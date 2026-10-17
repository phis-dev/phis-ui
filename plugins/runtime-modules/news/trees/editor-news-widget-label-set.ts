import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_NEWS_RUNTIME_MODULE_IDENTITY } from "../ids";

/**
 * What the News table says, wherever a Site places it.
 *
 * The words of the surface, not of the entries: an entry's own title arrives from Core in the Site's
 * source language, because this is where it is written rather than read.
 */
const PHI_EDITOR_NEWS_WIDGET_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_NEWS_RUNTIME_MODULE_IDENTITY, {
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
    row_submitted: "Submitted",
    column_title: "Title",
    column_slug: "Address",
    column_status: "Status",
    column_language: "Written in",
    column_tags: "Tags",
    column_published: "Published",
    column_expires: "Expires",
    column_changed: "Changed",
    column_author: "Author",
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
    action_new: "New entry",
    action_edit: "Edit",
    action_publish: "Publish",
    action_submit: "Submit for publication",
    submit_title: "Submit this entry for publication",
    submit_description: definePhiMessageLabel(
      "A Publisher is asked to publish the version you see now. You can keep writing; what you write next waits for the next submission.",
    ),
    form_save: "Save",
    form_cancel: "Cancel",
    footer_count: "%1 entries",
    form_title: "News entry",
    create_title: "New news entry",
    publication_title: "Publication",
    form_slug_placeholder: "news-entry-address",
    form_slug_error: definePhiMessageLabel("An address is required: lower case, digits and hyphens."),
    form_title_error: "A title is required.",
    form_subtitle_label: "Subtitle",
    form_content_label: "Body",
    form_content_placeholder: definePhiMessageLabel("Markdown. Headings, lists and links are kept."),
    form_content_error: "A body is required.",
    form_link_label: "Link",
    form_link_none: "None",
    form_link_page: "Page",
    form_link_external: "Address",
    form_link_page_placeholder: "Select a Page",
    form_link_external_placeholder: "https://example.com",
    form_link_new_tab: "Open in a new tab",
    form_link_pages_unavailable: definePhiMessageLabel("The Pages could not be loaded."),
    form_translate_label: "May be translated",
    form_published_at_placeholder: "Now",
    form_expires_at_placeholder: "No end",
  },
});

export type PhiEditorNewsWidgetLabels = {
  searchPlaceholder: string;
  footer: string;
  statusLabel: string;
  statuses: { all: string; draft: string; published: string };
  rowStatus: { draft: string; published: string; submitted: string };
  columns: {
    title: string;
    slug: string;
    status: string;
    language: string;
    tags: string;
    published: string;
    expires: string;
    changed: string;
    author: string;
  };
  actions: { withdraw: string; delete: string; new: string; edit: string; publish: string; submit: string };
  overlays: { create: string; entry: string; publication: string };
  form: {
    save: string;
    cancel: string;
    slugPlaceholder: string;
    slugError: string;
    titleError: string;
    subtitleLabel: string;
    contentLabel: string;
    contentPlaceholder: string;
    contentError: string;
    linkLabel: string;
    link: {
      none: string;
      page: string;
      external: string;
      pagePlaceholder: string;
      externalPlaceholder: string;
      newTab: string;
      pagesUnavailable: string;
    };
    translateLabel: string;
    publishedAtPlaceholder: string;
    expiresAtPlaceholder: string;
  };
  withdraw: { title: string; description: string };
  submit: { title: string; description: string };
  delete: { title: string; description: string };
  empty: { title: string; text: string };
};

export async function getPhiEditorNewsWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiEditorNewsWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_NEWS_WIDGET_LABEL_SET);
  return {
    searchPlaceholder: labels.search_placeholder,
    footer: labels.footer_count,
    statusLabel: labels.status_label,
    statuses: { all: labels.status_all, draft: labels.status_draft, published: labels.status_published },
    rowStatus: { draft: labels.row_draft, published: labels.row_published, submitted: labels.row_submitted },
    columns: {
      title: labels.column_title,
      slug: labels.column_slug,
      status: labels.column_status,
      language: labels.column_language,
      tags: labels.column_tags,
      published: labels.column_published,
      expires: labels.column_expires,
      changed: labels.column_changed,
      author: labels.column_author,
    },
    actions: {
      withdraw: labels.action_withdraw,
      delete: labels.action_delete,
      new: labels.action_new,
      edit: labels.action_edit,
      publish: labels.action_publish,
      submit: labels.action_submit,
    },
    overlays: {
      create: labels.create_title,
      entry: labels.form_title,
      publication: labels.publication_title,
    },
    form: {
      save: labels.form_save,
      cancel: labels.form_cancel,
      slugPlaceholder: labels.form_slug_placeholder,
      slugError: labels.form_slug_error,
      titleError: labels.form_title_error,
      subtitleLabel: labels.form_subtitle_label,
      contentLabel: labels.form_content_label,
      contentPlaceholder: labels.form_content_placeholder,
      contentError: labels.form_content_error,
      linkLabel: labels.form_link_label,
      link: {
        none: labels.form_link_none,
        page: labels.form_link_page,
        external: labels.form_link_external,
        pagePlaceholder: labels.form_link_page_placeholder,
        externalPlaceholder: labels.form_link_external_placeholder,
        newTab: labels.form_link_new_tab,
        pagesUnavailable: labels.form_link_pages_unavailable,
      },
      translateLabel: labels.form_translate_label,
      publishedAtPlaceholder: labels.form_published_at_placeholder,
      expiresAtPlaceholder: labels.form_expires_at_placeholder,
    },
    withdraw: { title: labels.withdraw_title, description: labels.withdraw_description },
    submit: { title: labels.submit_title, description: labels.submit_description },
    delete: { title: labels.delete_title, description: labels.delete_description },
    empty: { title: labels.empty_title, text: labels.empty_text },
  };
}
