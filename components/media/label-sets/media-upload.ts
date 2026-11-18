import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS,
  type PhiMediaUploadFieldLabels,
  type PhiMediaUploadLabels,
} from "../media-upload-labels";

const REFUSALS = PHI_MEDIA_UPLOAD_DEFAULT_LABELS;
const FIELD = PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS;

/**
 * Core's one set of upload texts, read by every surface that uploads (see `media-upload-labels.ts`).
 *
 * A Module that offers an upload field translates none of this: the Form Widget reads it for every
 * Form that has one, the Media folder and the slot upload read it through the Media set, and the
 * Builder's mask picker through the authoring tools.
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
  },
});

export async function getPhiMediaUploadLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<{ field: PhiMediaUploadFieldLabels; refusals: PhiMediaUploadLabels }> {
  const labels = await getPhiLabelSet(options, PHI_MEDIA_UPLOAD_LABEL_SET);
  return {
    field: {
      trigger: labels.trigger,
      dropHint: labels.drop_hint,
      tooMany: labels.too_many,
      pending: labels.pending,
    },
    refusals: {
      errorGeneric: labels.error_generic,
      errorNetwork: labels.error_network,
      errorTooLarge: labels.error_too_large,
      errorDuplicate: labels.error_duplicate,
      errorTypeNotAllowed: labels.error_type_not_allowed,
      errorQuotaExceeded: labels.error_quota_exceeded,
      errorSpaceUnavailable: labels.error_space_unavailable,
      errorStorageUnreachable: labels.error_storage_unreachable,
      errorFolderLocked: labels.error_folder_locked,
    },
  };
}
