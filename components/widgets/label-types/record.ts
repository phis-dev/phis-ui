import { PHI_INTERVAL_DEFAULT_LABELS, type PhiIntervalLabels } from "./interval";

export type PhiRecordWidgetLabels = {
  empty: string;
  missingBinding: string;
  recordReadUnsupported: string;
  loadFailed: string;
  /** The words of the `interval` renderer, from their own Label Set. */
  interval: PhiIntervalLabels;
};

export const PHI_RECORD_WIDGET_DEFAULT_LABELS: PhiRecordWidgetLabels = {
  empty: "Open a row to read it here.",
  missingBinding: "Record provider binding is missing.",
  recordReadUnsupported: 'Table resource "%1" does not offer single records.',
  loadFailed: "The record could not be loaded.",
  interval: PHI_INTERVAL_DEFAULT_LABELS,
};

export function formatPhiRecordWidgetLabel(template: string, value: string | number) {
  return template.replace("%1", String(value));
}
