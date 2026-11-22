import "server-only";

import { getPhiMediaWidgetLabels } from "../media/label-sets/media";
import { getPhiMediaUploadLabels } from "../media/label-sets/media-upload";
import {
  PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY,
  PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY,
} from "../../constants/media-library-provider-keys";
import type { PhiGlobalTranslatorOptions } from "../../gateway/tr";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import type { PhiFormDescriptor } from "../../types/form-descriptor";
import { PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS } from "./media-asset-field-keys";
import { PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY, PHI_FORM_UPLOAD_LABEL_KEYS } from "./upload-field-keys";
import { getPhiTableFormFieldLabels } from "../widgets/label-sets/table";
import { PHI_FORM_TABLE_FIELD_PROVIDER_KEY } from "./table-field-keys";
import { PHI_FORM_TABLE_LABEL_KEYS } from "./table-field-labels";
import type { PhiFormRenderContext } from "./form-resolution";

/**
 * What a Form's field types say for themselves, under the keys their controls read.
 *
 * The `media-asset` and `media-assets` fields are the same: the picker they open and the upload surface
 * say the Media Label Set's words, read here for every Form that has such a field
 * (`media-asset-field-keys.ts`), and the upload says its refusals and its hold under the upload field's keys. The `table` field says its add, remove and
 * empty words from Core's `widget:table` set (`table-field-labels.ts`) where its config names none.
 *
 * A field type whose control speaks -- the upload field's trigger, its drop hint, its holds and the
 * refusals of the upload -- says it from Core's `widget:upload` Label Set, read here for every Form that
 * has such a field. So a Module that places an upload field translates none of it, and no Form says it
 * in English because it forgot to. The Form Widget lays the Form's own Label Set over this, so a Form
 * that means different words for its field still says them.
 *
 * Beside the Form resolution rather than inside it: only the Form Widget draws fields, and the resolution
 * is part of the `@phis/ui/forms` entry, whose graph has no business carrying the translator.
 */
export async function resolvePhiFormFieldLabels(
  context: PhiFormRenderContext,
  descriptor: PhiFormDescriptor,
): Promise<Record<string, string>> {
  const hasUpload = descriptor.fields.some((field) => field.fieldProviderKey === PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY);
  const hasMediaAsset = descriptor.fields.some((field) =>
    field.fieldProviderKey === PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY ||
    field.fieldProviderKey === PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY);
  const hasTable = descriptor.fields.some((field) => field.fieldProviderKey === PHI_FORM_TABLE_FIELD_PROVIDER_KEY);
  if (!hasUpload && !hasMediaAsset && !hasTable) return {};
  const rt = phiRuntime(context.runtime);
  const options = {
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: context.runtime.locale.current,
  };
  const [upload, media, table] = await Promise.all([
    hasUpload || hasMediaAsset ? readUploadFieldLabels(options) : {},
    hasMediaAsset ? readMediaAssetFieldLabels(options) : {},
    hasTable ? readTableFieldLabels(options) : {},
  ]);
  return { ...upload, ...media, ...table };
}

async function readUploadFieldLabels(options: PhiGlobalTranslatorOptions): Promise<Record<string, string>> {
  const { field, refusals } = await getPhiMediaUploadLabels(options);
  const keys = PHI_FORM_UPLOAD_LABEL_KEYS;
  return {
    [keys.trigger]: field.trigger,
    [keys.dropHint]: field.dropHint,
    [keys.tooMany]: field.tooMany,
    [keys.pending]: field.pending,
    [keys.errorGeneric]: refusals.errorGeneric,
    [keys.errorNetwork]: refusals.errorNetwork,
    [keys.errorTooLarge]: refusals.errorTooLarge,
    [keys.errorDuplicate]: refusals.errorDuplicate,
    [keys.errorTypeNotAllowed]: refusals.errorTypeNotAllowed,
    [keys.errorQuotaExceeded]: refusals.errorQuotaExceeded,
    [keys.errorSpaceUnavailable]: refusals.errorSpaceUnavailable,
    [keys.errorStorageUnreachable]: refusals.errorStorageUnreachable,
    [keys.errorFolderLocked]: refusals.errorFolderLocked,
  };
}

async function readTableFieldLabels(options: PhiGlobalTranslatorOptions): Promise<Record<string, string>> {
  const { add, remove, empty } = await getPhiTableFormFieldLabels(options);
  const keys = PHI_FORM_TABLE_LABEL_KEYS;
  return { [keys.add]: add, [keys.remove]: remove, [keys.empty]: empty };
}

async function readMediaAssetFieldLabels(options: PhiGlobalTranslatorOptions): Promise<Record<string, string>> {
  const { tool, picker, space, upload } = await getPhiMediaWidgetLabels(options);
  const keys = PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS;
  return {
    [keys.popoverTitle]: picker.popoverTitle,
    [keys.searchPlaceholder]: tool.searchPlaceholder,
    [keys.folderLabel]: tool.folderLabel,
    [keys.spaceLabel]: space.label,
    [keys.emptyDescription]: picker.emptyDescription,
    [keys.loadFailedDescription]: picker.loadFailedDescription,
    [keys.clearLabel]: picker.clearLabel,
    [keys.reloadLabel]: tool.reloadLabel,
    [keys.tileSizeLabel]: picker.tileSizeLabel,
    [keys.sourceLabel]: picker.sourceLabel,
    [keys.sourceFailedText]: picker.sourceFailedText,
    [keys.importingLabel]: picker.importingLabel,
    [keys.importFailedText]: picker.importFailedText,
    [keys.loadMoreLabel]: picker.loadMoreLabel,
    [keys.chooseFromLibraryLabel]: tool.chooseFromLibraryLabel,
    [keys.uploadLabel]: upload.uploadToggleLabel,
    [keys.uploadDropTitle]: upload.dropTitle,
    [keys.uploadDropHint]: upload.dropHint,
    [keys.uploadRetryLabel]: upload.retryLabel,
    [keys.uploadDoneLabel]: upload.doneLabel,
    [keys.uploadFailedLabel]: upload.failedLabel,
    [keys.uploadSuccessTemplate]: upload.uploadSuccessTemplate,
  };
}
