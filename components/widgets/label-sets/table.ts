import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiTableWidgetLabels } from "../label-types/table";

const PHI_TABLE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:table",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    search: "Search",
    reset: "Reset",
    reload: "Reload",
    actions: "Actions",
    selected: "%1 selected",
    empty_title: "No rows found.",
    empty_description: "Adjust the table filters and try again.",
    yes: "Yes",
    no: "No",
    missing_binding: "Table provider binding is missing.",
    provider_unavailable: 'Table provider "%1" is not available.',
    missing_row_key: 'Table data is missing required row key "%1".',
    edit_row: "Edit row",
    save_row: "Save row",
    cancel_row: "Cancel row editing",
    drag_row: "Drag row",
    move_row_up: "Move row up",
    move_row_down: "Move row down",
  },
});

export async function getPhiTableWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiTableWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_TABLE_WIDGET_LABEL_SET);
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
  };
}
