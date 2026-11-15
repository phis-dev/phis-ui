import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_SLOT_UPLOAD_WIDGET_DEFAULT_LABELS,
  type PhiSlotUploadWidgetLabels,
} from "../label-types/slot-upload";

const DEFAULTS = PHI_SLOT_UPLOAD_WIDGET_DEFAULT_LABELS;

const PHI_SLOT_UPLOAD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:slot-upload",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    choose: DEFAULTS.choose,
    remove: DEFAULTS.remove,
    unconfigured: definePhiMessageLabel(DEFAULTS.unconfigured),
    no_row: definePhiMessageLabel(DEFAULTS.noRow),
    empty: definePhiMessageLabel(DEFAULTS.empty),
    file_title: definePhiMessageLabel(DEFAULTS.fileTitle),
    slot_missing: definePhiMessageLabel(DEFAULTS.slotMissing),
    server_answered: definePhiMessageLabel(DEFAULTS.serverAnswered),
    unreachable: definePhiMessageLabel(DEFAULTS.unreachable),
    remove_failed: definePhiMessageLabel(DEFAULTS.removeFailed),
  },
});

export async function getPhiSlotUploadWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiSlotUploadWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_SLOT_UPLOAD_WIDGET_LABEL_SET);
  return {
    unconfigured: labels.unconfigured,
    noRow: labels.no_row,
    choose: labels.choose,
    empty: labels.empty,
    remove: labels.remove,
    fileTitle: labels.file_title,
    slotMissing: labels.slot_missing,
    serverAnswered: labels.server_answered,
    unreachable: labels.unreachable,
    removeFailed: labels.remove_failed,
  };
}
