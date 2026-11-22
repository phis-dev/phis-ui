import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_MEDIA_WIDGET_DEFAULT_LABELS,
  type PhiAssetWidgetLabels,
} from "../media-widget-labels";
import { getPhiMediaUploadLabels } from "./media-upload";

/*
 * The Foundation's Media words: the picker, the Space names, the grid and the toolbar, with the four flag
 * words the toolbar's flag filter reads. Core's collection view reads the toolbar's and Core cannot import
 * the Asset Module, so they live here. The upload surface's texts are Core's `widget:upload`
 * (`media-upload.ts`) and the Inspector and the metadata editor are the Asset Module's own set
 * (`plugins/runtime-modules/asset/labels.ts`).
 */
const PHI_MEDIA_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:media",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    tool_search_placeholder: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.searchPlaceholder,
    tool_folder_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.folderLabel,
    tool_create_folder_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.createFolderLabel,
    tool_folder_locked_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.folderLockedLabel,
    tool_lock_folder_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.lockFolderLabel,
    tool_unlock_folder_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.unlockFolderLabel,
    tool_folder_locked_text: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.folderLockedText),
    tool_folder_lock_failed_text: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.folderLockFailedText),
    tool_flags_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.flagsLabel,
    tool_flag_placeholder: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.flagPlaceholder,
    tool_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.kindLabel,
    tool_reset_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.resetLabel,
    tool_reload_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.reloadLabel,
    tool_choose_from_library_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.chooseFromLibraryLabel,
    tool_image_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.imageKindLabel,
    tool_video_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.videoKindLabel,
    tool_audio_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.audioKindLabel,
    tool_pdf_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.pdfKindLabel,
    tool_markdown_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.markdownKindLabel,
    tool_document_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.documentKindLabel,
    tool_archive_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.archiveKindLabel,
    tool_font_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.fontKindLabel,
    tool_binary_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.binaryKindLabel,
    tool_other_kind_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.otherKindLabel,
    tool_featured_flag_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.featuredFlagLabel,
    tool_locked_flag_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.lockedFlagLabel,
    tool_mask_flag_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.maskFlagLabel,
    tool_background_flag_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.tool.backgroundFlagLabel,
    grid_empty_description: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.grid.emptyDescription),
    grid_delete_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.grid.deleteLabel,
    grid_delete_success_template: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.grid.deleteSuccessTemplate),
    grid_delete_failed_text: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.grid.deleteFailedText),
    grid_add_failed_text: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.grid.addFailedText),
    picker_trigger_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.triggerLabel,
    picker_popover_title: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.popoverTitle,
    picker_empty_description: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.emptyDescription),
    picker_load_failed_description: definePhiMessageLabel(
      PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.loadFailedDescription,
    ),
    picker_clear_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.clearLabel,
    picker_tile_size_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.tileSizeLabel,
    picker_source_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.sourceLabel,
    picker_source_failed_text: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.sourceFailedText),
    picker_importing_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.importingLabel,
    picker_import_failed_text: definePhiMessageLabel(PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.importFailedText),
    picker_load_more_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.picker.loadMoreLabel,
    space_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.space.label,
    space_site_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.space.site,
    space_user_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.space.user,
    space_group_label: PHI_MEDIA_WIDGET_DEFAULT_LABELS.space.group,
  },
});

export async function getPhiMediaWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiAssetWidgetLabels> {
  const [labels, upload] = await Promise.all([
    getPhiLabelSet(options, PHI_MEDIA_WIDGET_LABEL_SET),
    getPhiMediaUploadLabels(options),
  ]);
  return {
    tool: {
      searchPlaceholder: labels.tool_search_placeholder,
      folderLabel: labels.tool_folder_label,
      createFolderLabel: labels.tool_create_folder_label,
      folderLockedLabel: labels.tool_folder_locked_label,
      lockFolderLabel: labels.tool_lock_folder_label,
      unlockFolderLabel: labels.tool_unlock_folder_label,
      folderLockedText: labels.tool_folder_locked_text,
      folderLockFailedText: labels.tool_folder_lock_failed_text,
      flagsLabel: labels.tool_flags_label,
      flagPlaceholder: labels.tool_flag_placeholder,
      kindLabel: labels.tool_kind_label,
      resetLabel: labels.tool_reset_label,
      reloadLabel: labels.tool_reload_label,
      chooseFromLibraryLabel: labels.tool_choose_from_library_label,
      imageKindLabel: labels.tool_image_kind_label,
      videoKindLabel: labels.tool_video_kind_label,
      audioKindLabel: labels.tool_audio_kind_label,
      pdfKindLabel: labels.tool_pdf_kind_label,
      markdownKindLabel: labels.tool_markdown_kind_label,
      documentKindLabel: labels.tool_document_kind_label,
      archiveKindLabel: labels.tool_archive_kind_label,
      fontKindLabel: labels.tool_font_kind_label,
      binaryKindLabel: labels.tool_binary_kind_label,
      otherKindLabel: labels.tool_other_kind_label,
      featuredFlagLabel: labels.tool_featured_flag_label,
      lockedFlagLabel: labels.tool_locked_flag_label,
      maskFlagLabel: labels.tool_mask_flag_label,
      backgroundFlagLabel: labels.tool_background_flag_label,
    },
    upload: upload.upload,
    grid: {
      emptyDescription: labels.grid_empty_description,
      deleteLabel: labels.grid_delete_label,
      deleteSuccessTemplate: labels.grid_delete_success_template,
      deleteFailedText: labels.grid_delete_failed_text,
      addFailedText: labels.grid_add_failed_text,
    },
    picker: {
      triggerLabel: labels.picker_trigger_label,
      popoverTitle: labels.picker_popover_title,
      emptyDescription: labels.picker_empty_description,
      loadFailedDescription: labels.picker_load_failed_description,
      clearLabel: labels.picker_clear_label,
      tileSizeLabel: labels.picker_tile_size_label,
      sourceLabel: labels.picker_source_label,
      sourceFailedText: labels.picker_source_failed_text,
      importingLabel: labels.picker_importing_label,
      importFailedText: labels.picker_import_failed_text,
      loadMoreLabel: labels.picker_load_more_label,
    },
    space: {
      label: labels.space_label,
      site: labels.space_site_label,
      user: labels.space_user_label,
      group: labels.space_group_label,
    },
  };
}
