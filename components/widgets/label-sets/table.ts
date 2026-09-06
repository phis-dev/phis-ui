import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  PHI_TR_CTX_WEB_UI_MESSAGE,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
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
    // What the table says rather than what it labels: sentences, kept out of the caption register.
    selected: { text: "%1 selected", ctx: PHI_TR_CTX_WEB_UI_MESSAGE },
    empty_title: { text: "No rows found.", ctx: PHI_TR_CTX_WEB_UI_MESSAGE },
    empty_description: { text: "Adjust the table filters and try again.", ctx: PHI_TR_CTX_WEB_UI_MESSAGE },
    yes: "Yes",
    no: "No",
    missing_binding: { text: "Table provider binding is missing.", ctx: PHI_TR_CTX_WEB_UI_MESSAGE },
    provider_unavailable: { text: 'Table provider "%1" is not available.', ctx: PHI_TR_CTX_WEB_UI_MESSAGE },
    missing_row_key: { text: 'Table data is missing required row key "%1".', ctx: PHI_TR_CTX_WEB_UI_MESSAGE },
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
