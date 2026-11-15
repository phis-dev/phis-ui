/**
 * What the slot upload field says. The refusals of the upload it runs are not here: they are the shared
 * reading of `PHI_MEDIA_UPLOAD_DEFAULT_LABELS`, the same as on every other Media upload surface.
 */
export type PhiSlotUploadWidgetLabels = {
  /** The field names no Add-on, table or slot, so there is nowhere to put a file. */
  unconfigured: string;
  /** No row has arrived yet, so there is nothing to upload to. */
  noRow: string;
  choose: string;
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
};

export const PHI_SLOT_UPLOAD_WIDGET_DEFAULT_LABELS: PhiSlotUploadWidgetLabels = {
  unconfigured: "This field names no Add-on, table or slot.",
  noRow: "Nothing selected.",
  choose: "Choose a file",
  empty: "Nothing here yet.",
  remove: "Remove this file",
  fileTitle: "%1 — %2 bytes",
  slotMissing: 'This table declares no slot named "%1".',
  serverAnswered: "The server answered %1.",
  unreachable: "Unreachable.",
  removeFailed: "That file stayed.",
};

/** Fills `%1`, `%2`, ... of a slot upload template in order. */
export function formatPhiSlotUploadWidgetLabel(template: string, ...values: readonly (string | number)[]) {
  return values.reduce<string>((text, value, index) => text.replace(`%${index + 1}`, String(value)), template);
}
