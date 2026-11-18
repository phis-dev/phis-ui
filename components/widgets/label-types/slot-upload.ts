import { PHI_MEDIA_WIDGET_DEFAULT_LABELS, type PhiAreaUploadWidgetLabels } from "../../media/media-widget-labels";

/**
 * What the slot upload field says. The refusals of the upload it runs are not here: they are the shared
 * reading of `PHI_MEDIA_UPLOAD_DEFAULT_LABELS`, the same as on every other Media upload surface.
 *
 * The drop area's title and hint, the state of an upload and its retry are not written a second time
 * either: `upload` is the Media upload surface's own texts, which are Core's `widget:upload` set
 * (`label-sets/media-upload.ts`), so the two surfaces share one wording and one translation key per text.
 */
export type PhiSlotUploadWidgetLabels = {
  /** The field names no Add-on, table or slot, so there is nowhere to put a file. */
  unconfigured: string;
  /** No row has arrived yet, so there is nothing to upload to. */
  noRow: string;
  empty: string;
  remove: string;
  /** A file of the slot, `%1` its content type and `%2` its size in bytes. */
  fileTitle: string;
  /** `%1` is the slot name the field was configured with. */
  slotMissing: string;
  /** `%1` is the HTTP status the server answered with. */
  serverAnswered: string;
  unreachable: string;
  removeFailed: string;
  /** The Media folder's upload texts: `dropTitle`, `dropHint`, `retryLabel`, `failedLabel`, and the refusals. */
  upload: PhiAreaUploadWidgetLabels;
};

export const PHI_SLOT_UPLOAD_WIDGET_DEFAULT_LABELS: PhiSlotUploadWidgetLabels = {
  unconfigured: "This field names no Add-on, table or slot.",
  noRow: "Nothing selected.",
  empty: "Nothing here yet.",
  remove: "Remove this file",
  fileTitle: "%1 — %2 bytes",
  slotMissing: 'This table declares no slot named "%1".',
  serverAnswered: "The server answered %1.",
  unreachable: "Unreachable.",
  removeFailed: "That file stayed.",
  upload: PHI_MEDIA_WIDGET_DEFAULT_LABELS.upload,
};

/** Fills `%1`, `%2`, ... of a slot upload template in order. */
export function formatPhiSlotUploadWidgetLabel(template: string, ...values: readonly (string | number)[]) {
  return values.reduce<string>((text, value, index) => text.replace(`%${index + 1}`, String(value)), template);
}
