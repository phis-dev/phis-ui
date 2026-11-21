import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS, type PhiMediaUploadLabels } from "../media/media-upload-labels";
import { PHI_FORM_UPLOAD_LABEL_KEYS } from "./upload-field-keys";

/**
 * The upload's refusals as a field control reads them from its labels: under `PHI_FORM_UPLOAD_LABEL_KEYS`,
 * where the Form Widget put Core's `widget:upload` words for every Form with an upload field or a
 * `media-asset` field (`form-field-labels.ts`), and the source wording where it put none.
 *
 * Beside the keys rather than in their file: the keys are on the Server graph of every Page
 * (`form-field-labels.ts`, `form-provider-contract.ts`), and only the field controls read the words back.
 */
export function readPhiFormUploadRefusalLabels(labels: Readonly<Record<string, string>> | undefined): PhiMediaUploadLabels {
  const read = (key: keyof PhiMediaUploadLabels) =>
    labels?.[PHI_FORM_UPLOAD_LABEL_KEYS[key]]?.trim() || PHI_MEDIA_UPLOAD_DEFAULT_LABELS[key];
  return {
    errorGeneric: read("errorGeneric"),
    errorNetwork: read("errorNetwork"),
    errorTooLarge: read("errorTooLarge"),
    errorDuplicate: read("errorDuplicate"),
    errorTypeNotAllowed: read("errorTypeNotAllowed"),
    errorQuotaExceeded: read("errorQuotaExceeded"),
    errorSpaceUnavailable: read("errorSpaceUnavailable"),
    errorStorageUnreachable: read("errorStorageUnreachable"),
    errorFolderLocked: read("errorFolderLocked"),
  };
}
