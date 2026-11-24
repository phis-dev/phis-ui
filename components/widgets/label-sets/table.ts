import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiTableWidgetLabels } from "../label-types/table";
import { getPhiIntervalLabels } from "./interval";
import { PHI_FORM_TABLE_DEFAULT_LABELS } from "../../forms/table-field-labels";

const PHI_TABLE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:table",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    search: "Search",
    reset: "Reset",
    reload: "Reload",
    actions: "Actions",
    // What the table says rather than what it labels: sentences, kept out of the caption register.
    selected: definePhiMessageLabel("%1 selected"),
    empty_title: definePhiMessageLabel("No rows found."),
    empty_description: definePhiMessageLabel("Adjust the table filters and try again."),
    yes: "Yes",
    no: "No",
    missing_binding: definePhiMessageLabel("Table provider binding is missing."),
    provider_unavailable: definePhiMessageLabel('Table provider "%1" is not available.'),
    missing_row_key: definePhiMessageLabel('Table data is missing required row key "%1".'),
    edit_row: "Edit row",
    save_row: "Save row",
    cancel_row: "Cancel row editing",
    drag_row: "Drag row",
    move_row_up: "Move row up",
    move_row_down: "Move row down",
    // The Dialog that shows an action's value once.
    reveal_copy_and_close: "Copy and close",
    reveal_close: "Close",
    reveal_copy_failed: definePhiMessageLabel("The value could not be copied. Select it and copy it by hand before closing."),
    // The Core `table` form field's words where its config names none (`table-field-labels.ts`).
    form_add: PHI_FORM_TABLE_DEFAULT_LABELS.add,
    form_remove: PHI_FORM_TABLE_DEFAULT_LABELS.remove,
    form_empty: definePhiMessageLabel(PHI_FORM_TABLE_DEFAULT_LABELS.empty),
  },
});

export async function getPhiTableWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiTableWidgetLabels> {
  const [labels, interval] = await Promise.all([
    getPhiLabelSet(options, PHI_TABLE_WIDGET_LABEL_SET),
    getPhiIntervalLabels(options),
  ]);
  return {
    search: labels.search,
    reset: labels.reset,
    reload: labels.reload,
    actions: labels.actions,
    selected: labels.selected,
    emptyTitle: labels.empty_title,
    emptyDescription: labels.empty_description,
    yes: labels.yes,
    no: labels.no,
    missingBinding: labels.missing_binding,
    providerUnavailable: labels.provider_unavailable,
    missingRowKey: labels.missing_row_key,
    editRow: labels.edit_row,
    saveRow: labels.save_row,
    cancelRow: labels.cancel_row,
    dragRow: labels.drag_row,
    moveRowUp: labels.move_row_up,
    moveRowDown: labels.move_row_down,
    interval,
    reveal: {
      copyAndClose: labels.reveal_copy_and_close,
      close: labels.reveal_close,
      copyFailed: labels.reveal_copy_failed,
    },
  };
}

/** The Core `table` form field's add, remove and empty words, which the Form Widget hands to the field. */
export async function getPhiTableFormFieldLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_TABLE_WIDGET_LABEL_SET);
  return { add: labels.form_add, remove: labels.form_remove, empty: labels.form_empty };
}
