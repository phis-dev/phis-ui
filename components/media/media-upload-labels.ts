/**
 * What every upload surface says, in one place: the refusals of the upload itself and the few words an
 * upload field adds around it.
 *
 * They belong to the upload and not to the surface that offers one. A file that is too large is too
 * large in a reply, in the Media folder, in an Add-on's slot and in the mask picker alike, and a wording
 * per surface was a translation per surface -- or, where a surface forgot, English. So the texts are
 * defined once, in Core's `widget:upload` Label Set (`label-sets/media-upload.ts`), and every surface reads
 * them from there.
 *
 * This file has no directive on purpose: the Label Set reads these defaults on the Server and the
 * controls read the types in the browser.
 */
export type PhiMediaUploadLabels = {
  errorGeneric: string;
  errorNetwork: string;
  errorTooLarge: string;
  errorDuplicate: string;
  errorTypeNotAllowed: string;
  errorQuotaExceeded: string;
  errorSpaceUnavailable: string;
  /** The body never reached the storage Provider, or the Provider refused it. */
  errorStorageUnreachable: string;
  /** The Folder the upload was meant for is locked; only an upload that names a Folder can meet it. */
  errorFolderLocked: string;
};

/**
 * The source wording of the refusals, which the Label Set translates.
 *
 * Read directly only where no Label Set has arrived yet -- the first paint before a provider is
 * mounted -- and never as a surface's own wording.
 */
export const PHI_MEDIA_UPLOAD_DEFAULT_LABELS: PhiMediaUploadLabels = {
  errorGeneric: "The upload did not work.",
  errorNetwork: "The site could not be reached.",
  errorTooLarge: "That file is too large.",
  errorDuplicate: "That file is already here.",
  errorTypeNotAllowed: "That file type is not accepted here.",
  errorQuotaExceeded: "There is no room left in this space.",
  errorSpaceUnavailable: "That space is not available.",
  errorStorageUnreachable: "The file storage could not be reached.",
  errorFolderLocked: "This folder is locked. Nothing can be uploaded into it until it is unlocked.",
};

/** What a Form's upload field says around the upload: its trigger, the drop hint and its two holds. */
export type PhiMediaUploadFieldLabels = {
  trigger: string;
  /** Beneath the trigger in an upload area: that a drop works too. */
  dropHint: string;
  tooMany: string;
  /** Shown on the field when the Form is submitted while a file is still on its way. */
  pending: string;
};

export const PHI_MEDIA_UPLOAD_FIELD_DEFAULT_LABELS: PhiMediaUploadFieldLabels = {
  trigger: "Attach a file",
  dropHint: "or drop it here",
  tooMany: "No more files fit here.",
  pending: "Wait until the file has arrived.",
};
