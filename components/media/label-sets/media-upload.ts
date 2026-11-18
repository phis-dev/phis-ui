import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS,
  type PhiMediaUploadFieldLabels,
  type PhiMediaUploadLabels,
} from "../media-upload-labels";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS, type PhiAreaUploadWidgetLabels } from "../media-widget-labels";

const REFUSALS = PHI_MEDIA_UPLOAD_DEFAULT_LABELS;
const FIELD = PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS;
const AREA = PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload;

/**
 * Core's one set of upload texts, read by every surface that uploads (see `media-upload-labels.ts`).
 *
 * A Module that offers an upload field translates none of this: the Form Widget reads it for every
 * Form that has one, the Media folder reads it through the Media set (`getPhiMediaWidgetLabels`
 * composes the `upload` group), the slot upload reads the `upload` group directly, and the Builder's
 * mask picker reads the refusals through the authoring tools.
 *
 * The `area_*` texts are the Media upload surface's own (the drop area, the status words, the messages
 * after an upload or a delete); the Form field's `trigger` and `drop_hint` are another wording of
 * another surface, so the two sets of keys do not share a name.
 */
const PHI_MEDIA_UPLOAD_LABEL_SET = definePhiLabelSet({
  key: "widget:upload",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    trigger: FIELD.trigger,
    drop_hint: FIELD.dropHint,
    too_many: definePhiMessageLabel(FIELD.tooMany),
    pending: definePhiMessageLabel(FIELD.pending),
    error_generic: definePhiMessageLabel(REFUSALS.errorGeneric),
    error_network: definePhiMessageLabel(REFUSALS.errorNetwork),
    error_too_large: definePhiMessageLabel(REFUSALS.errorTooLarge),
    error_duplicate: definePhiMessageLabel(REFUSALS.errorDuplicate),
    error_type_not_allowed: definePhiMessageLabel(REFUSALS.errorTypeNotAllowed),
    error_quota_exceeded: definePhiMessageLabel(REFUSALS.errorQuotaExceeded),
    error_space_unavailable: definePhiMessageLabel(REFUSALS.errorSpaceUnavailable),
    error_storage_unreachable: definePhiMessageLabel(REFUSALS.errorStorageUnreachable),
    error_folder_locked: definePhiMessageLabel(REFUSALS.errorFolderLocked),
    area_drop_title: AREA.dropTitle,
    area_drop_hint: AREA.dropHint,
    area_upload_toggle_label: AREA.uploadToggleLabel,
    area_retry_label: AREA.retryLabel,
    area_delete_label: AREA.deleteLabel,
    area_done_label: AREA.doneLabel,
    area_failed_label: AREA.failedLabel,
    area_delete_success_template: definePhiMessageLabel(AREA.deleteSuccessTemplate),
    area_upload_success_template: definePhiMessageLabel(AREA.uploadSuccessTemplate),
    area_delete_failed_text: definePhiMessageLabel(AREA.deleteFailedText),
  },
});

export async function getPhiMediaUploadLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<{
  field: PhiMediaUploadFieldLabels;
  refusals: PhiMediaUploadLabels;
  /** The Media upload surface's texts, refusals included: what `PhiAreaUploadWidgetLabels` is filled from. */
  upload: PhiAreaUploadWidgetLabels;
}> {
  const labels = await getPhiLabelSet(options, PHI_MEDIA_UPLOAD_LABEL_SET);
  const refusals: PhiMediaUploadLabels = {
    errorGeneric: labels.error_generic,
    errorNetwork: labels.error_network,
    errorTooLarge: labels.error_too_large,
    errorDuplicate: labels.error_duplicate,
    errorTypeNotAllowed: labels.error_type_not_allowed,
    errorQuotaExceeded: labels.error_quota_exceeded,
    errorSpaceUnavailable: labels.error_space_unavailable,
    errorStorageUnreachable: labels.error_storage_unreachable,
    errorFolderLocked: labels.error_folder_locked,
  };
  return {
    field: {
      trigger: labels.trigger,
      dropHint: labels.drop_hint,
      tooMany: labels.too_many,
      pending: labels.pending,
    },
    refusals,
    upload: {
      dropTitle: labels.area_drop_title,
      dropHint: labels.area_drop_hint,
      uploadToggleLabel: labels.area_upload_toggle_label,
      retryLabel: labels.area_retry_label,
      deleteLabel: labels.area_delete_label,
      doneLabel: labels.area_done_label,
      failedLabel: labels.area_failed_label,
      deleteSuccessTemplate: labels.area_delete_success_template,
      uploadSuccessTemplate: labels.area_upload_success_template,
      deleteFailedText: labels.area_delete_failed_text,
      refusals,
    },
  };
}
