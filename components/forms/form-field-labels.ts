import "server-only";

import { getPhiMediaUploadLabels } from "../media/label-sets/media-upload";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import type { PhiFormDescriptor } from "../../types/form-descriptor";
import { PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY, PHI_FORM_UPLOAD_LABEL_KEYS } from "./upload-field-keys";
import type { PhiFormRenderContext } from "./form-resolution";

/**
 * What a Form's field types say for themselves, under the keys their controls read.
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
  if (!descriptor.fields.some((field) => field.fieldProviderKey === PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY)) {
    return {};
  }
  const rt = phiRuntime(context.runtime);
  const { field, refusals } = await getPhiMediaUploadLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: context.runtime.locale.current,
  });
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
