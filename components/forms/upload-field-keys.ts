import { createPhiModuleScopedKey } from "../../constants/runtime-module-ownership";
import type { PhiFormProviderKey } from "../../types/form-descriptor";

/**
 * The upload field's own names, apart from the rest of the Form contract.
 *
 * The Form Widget reads the upload field's texts on the Server (`form-field-labels.ts`) and needs only
 * these two to do it: which field type is the upload field, and the keys its control reads its words
 * under. `form-provider-contract.ts` re-exports both, so nothing else has to know they live here; this
 * file exists so the Server graph of every Page does not carry the whole contract to learn them.
 */
export const PHI_FORM_UPLOAD_FIELD_PROVIDER_KEY = createPhiModuleScopedKey("form-field", "upload") as PhiFormProviderKey;

export const PHI_FORM_UPLOAD_LABEL_KEYS = {
  trigger: "uploadTrigger",
  /** Beneath the trigger in an upload area (`config.presentation: "area"`): that a drop works too. */
  dropHint: "uploadDropHint",
  tooMany: "uploadErrorTooMany",
  /** Shown on the field when the Form is submitted while a file is still on its way. */
  pending: "uploadPending",
  errorGeneric: "uploadErrorGeneric",
  errorNetwork: "uploadErrorNetwork",
  errorTooLarge: "uploadErrorTooLarge",
  errorDuplicate: "uploadErrorDuplicate",
  errorTypeNotAllowed: "uploadErrorTypeNotAllowed",
  errorQuotaExceeded: "uploadErrorQuotaExceeded",
  errorSpaceUnavailable: "uploadErrorSpaceUnavailable",
  errorStorageUnreachable: "uploadErrorStorageUnreachable",
  errorFolderLocked: "uploadErrorFolderLocked",
} as const;
