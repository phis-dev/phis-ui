import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiEditorTranslationsWidgetLabels } from "../label-types/editor-translations";

const PHI_EDITOR_TRANSLATIONS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:editor-translations",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Translations",
    description: "Edit translated site messages for the selected language.",
    source_locale_label: "Source language",
    target_locale_label: "Target language",
    context_label: "Context",
    status_label: "Status",
    search_placeholder: "Search source, context, or translation",
    reset_label: "Reset",
    refresh_label: "Refresh",
    status_all: "All",
    status_missing: "Missing",
    status_translated: "Translated",
    row_missing: "Missing",
    row_translated: "Translated",
    column_source: "Source",
    column_context: "Context",
    column_status: "Status",
    column_translation: "Translation",
    column_created: "Created",
    column_updated: "Updated",
    column_actions: "Actions",
    action_edit: "Edit",
    action_save: "Save",
    action_cancel: "Cancel",
    action_delete: "Delete",
    translation_placeholder: "Enter translation",
    delete_title: "Delete translation",
    delete_description: "Delete this translated variant?",
    empty_title: "No translations found.",
    empty_text: "No source messages match the current filters.",
    load_error: "Failed to load translations.",
    save_error: "Failed to save translation.",
    delete_error: "Failed to delete translation.",
    save_success: "Translation saved.",
    delete_success: "Translation deleted.",
  },
});

export async function getPhiEditorTranslationsWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiEditorTranslationsWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_EDITOR_TRANSLATIONS_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    sourceLocaleLabel: labels.source_locale_label,
    targetLocaleLabel: labels.target_locale_label,
    contextLabel: labels.context_label,
    statusLabel: labels.status_label,
    searchPlaceholder: labels.search_placeholder,
    resetLabel: labels.reset_label,
    refreshLabel: labels.refresh_label,
    statuses: {
      all: labels.status_all,
      missing: labels.status_missing,
      translated: labels.status_translated,
    },
    rowStatus: {
      missing: labels.row_missing,
      translated: labels.row_translated,
    },
    columns: {
      source: labels.column_source,
      context: labels.column_context,
      status: labels.column_status,
      translation: labels.column_translation,
      created: labels.column_created,
      updated: labels.column_updated,
      actions: labels.column_actions,
    },
    actions: {
      edit: labels.action_edit,
      save: labels.action_save,
      cancel: labels.action_cancel,
      delete: labels.action_delete,
    },
    translationPlaceholder: labels.translation_placeholder,
    delete: {
      title: labels.delete_title,
      description: labels.delete_description,
    },
    empty: {
      title: labels.empty_title,
      text: labels.empty_text,
    },
    feedback: {
      saveSuccess: labels.save_success,
      deleteSuccess: labels.delete_success,
    },
    errors: {
      load: labels.load_error,
      save: labels.save_error,
      delete: labels.delete_error,
    },
  };
}
