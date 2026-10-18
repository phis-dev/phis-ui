import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the entries Table, its dialogs and its Forms say, for every content kind (`CONTENT_ENTRIES.md`).
 *
 * The words of the surface, not of the entries: an entry's own title arrives from Core in the Site's
 * source language, because this is where it is written rather than read. What differs by kind -- "New news
 * entry", "New blog post" -- is the kind's Module's own Label Set.
 */
const PHI_CONTENT_ENTRY_EDITOR_LABEL_SET = definePhiLabelSet({
  key: "widget:content-entries-editor",
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
    column_category: "Category",
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
    publication_title: "Publication",
    form_slug_placeholder: "entry-address",
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
    action_curate: "Author and category",
    curation_title: "Author and category",
    curation_author_none: "Nobody",
    curation_category_none: "None",
    categories_widget: "categories",
    categories_title: "Categories",
    categories_column_label: "Name",
    categories_column_slug: "Address",
    categories_column_order: "Order",
    categories_column_entries: "Entries",
    categories_empty_title: "No categories yet",
    categories_empty_text: definePhiMessageLabel("Entries are filed under none until the Site has a category."),
    categories_footer: "%1 categories",
    categories_action_new: "New category",
    categories_action_edit: "Edit",
    categories_action_delete: "Delete",
    categories_create_title: "New category",
    categories_edit_title: "Category",
    categories_delete_title: "Delete this category",
    categories_delete_description: definePhiMessageLabel(
      "Its entries are filed under none. Their words stay as they are.",
    ),
    categories_label_error: "A name is required.",
    categories_slug_placeholder: "Made from the name",
  },
});

export type PhiContentEntryEditorLabels = {
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
    category: string;
  };
  actions: {
    withdraw: string;
    delete: string;
    new: string;
    edit: string;
    publish: string;
    submit: string;
    curate: string;
  };
  overlays: { publication: string; curation: string };
  /** The two empty choices of the curation Form. */
  curation: { authorNone: string; categoryNone: string };
  /** The kind's categories: their Table, its dialogs and its Form. */
  categories: {
    widgetLabel: string;
    title: string;
    columns: { label: string; slug: string; order: string; entries: string };
    empty: { title: string; text: string };
    footer: string;
    actions: { new: string; edit: string; delete: string };
    overlays: { create: string; edit: string };
    delete: { title: string; description: string };
    form: { labelError: string; slugPlaceholder: string };
  };
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
  empty: { text: string };
};

export async function getPhiContentEntryEditorLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiContentEntryEditorLabels> {
  const labels = await getPhiLabelSet(options, PHI_CONTENT_ENTRY_EDITOR_LABEL_SET);
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
      category: labels.column_category,
    },
    actions: {
      withdraw: labels.action_withdraw,
      delete: labels.action_delete,
      new: labels.action_new,
      edit: labels.action_edit,
      publish: labels.action_publish,
      submit: labels.action_submit,
      curate: labels.action_curate,
    },
    overlays: { publication: labels.publication_title, curation: labels.curation_title },
    curation: { authorNone: labels.curation_author_none, categoryNone: labels.curation_category_none },
    categories: {
      widgetLabel: labels.categories_widget,
      title: labels.categories_title,
      columns: {
        label: labels.categories_column_label,
        slug: labels.categories_column_slug,
        order: labels.categories_column_order,
        entries: labels.categories_column_entries,
      },
      empty: { title: labels.categories_empty_title, text: labels.categories_empty_text },
      footer: labels.categories_footer,
      actions: {
        new: labels.categories_action_new,
        edit: labels.categories_action_edit,
        delete: labels.categories_action_delete,
      },
      overlays: { create: labels.categories_create_title, edit: labels.categories_edit_title },
      delete: { title: labels.categories_delete_title, description: labels.categories_delete_description },
      form: { labelError: labels.categories_label_error, slugPlaceholder: labels.categories_slug_placeholder },
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
    empty: { text: labels.empty_text },
  };
}

/**
 * What the list and the detail Widget say around the entries, which is everything the Site did not write
 * itself. The entries' own words come from Core already translated for the page's language.
 */
const PHI_CONTENT_ENTRY_READER_LABEL_SET = definePhiLabelSet({
  key: "widget:content-entries",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    empty_title: "Nothing published yet",
    empty_text: definePhiMessageLabel("There is nothing published here at the moment."),
    unavailable: definePhiMessageLabel("The entries could not be loaded just now."),
    read_more: "Read more",
    read_entry: "Read",
  },
});

export async function getPhiContentEntryReaderLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_CONTENT_ENTRY_READER_LABEL_SET);
  return {
    emptyTitle: labels.empty_title,
    emptyText: labels.empty_text,
    unavailable: labels.unavailable,
    readMore: labels.read_more,
    readEntry: labels.read_entry,
  };
}

export type PhiContentEntryReaderLabels = Awaited<ReturnType<typeof getPhiContentEntryReaderLabels>>;
