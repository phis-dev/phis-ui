import { PHI_INTERVAL_DEFAULT_LABELS, type PhiIntervalLabels } from "./interval";
import {
  PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS,
  type PhiRevealOnceDialogLabels,
} from "../../controls/phi-reveal-once-dialog-labels";

export type PhiTableWidgetLabels = {
  search: string;
  reset: string;
  reload: string;
  actions: string;
  selected: string;
  emptyTitle: string;
  emptyDescription: string;
  yes: string;
  no: string;
  missingBinding: string;
  providerUnavailable: string;
  missingRowKey: string;
  editRow: string;
  saveRow: string;
  cancelRow: string;
  dragRow: string;
  moveRowUp: string;
  moveRowDown: string;
  /** The words of the `interval` renderer, from their own Label Set. */
  interval: PhiIntervalLabels;
  /** The buttons of the Dialog that shows an action's value once (`reveal`). */
  reveal: PhiRevealOnceDialogLabels;
};

export const PHI_TABLE_WIDGET_DEFAULT_LABELS: PhiTableWidgetLabels = {
  search: "Search",
  reset: "Reset",
  reload: "Reload",
  actions: "Actions",
  selected: "%1 selected",
  emptyTitle: "No rows found.",
  emptyDescription: "Adjust the table filters and try again.",
  yes: "Yes",
  no: "No",
  missingBinding: "Table provider binding is missing.",
  providerUnavailable: 'Table provider "%1" is not available.',
  missingRowKey: 'Table data is missing required row key "%1".',
  editRow: "Edit row",
  saveRow: "Save row",
  cancelRow: "Cancel row editing",
  dragRow: "Drag row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  interval: PHI_INTERVAL_DEFAULT_LABELS,
  reveal: PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS,
};

export function formatPhiTableWidgetLabel(
  template: string,
  value: string | number,
) {
  return template.replace("%1", String(value));
}
