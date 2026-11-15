import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiRecordWidgetLabels } from "../label-types/record";
import { getPhiIntervalLabels } from "./interval";

const PHI_RECORD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:record",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    // What the Widget says rather than what it labels: sentences, kept out of the caption register.
    empty: definePhiMessageLabel("Open a row to read it here."),
    missing_binding: definePhiMessageLabel("Record provider binding is missing."),
    record_read_unsupported: definePhiMessageLabel('Table resource "%1" does not offer single records.'),
    load_failed: definePhiMessageLabel("The record could not be loaded."),
  },
});

export async function getPhiRecordWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiRecordWidgetLabels> {
  const [labels, interval] = await Promise.all([
    getPhiLabelSet(options, PHI_RECORD_WIDGET_LABEL_SET),
    getPhiIntervalLabels(options),
  ]);
  return {
    empty: labels.empty,
    missingBinding: labels.missing_binding,
    recordReadUnsupported: labels.record_read_unsupported,
    loadFailed: labels.load_failed,
    interval,
  };
}
