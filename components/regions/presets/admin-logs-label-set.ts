import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ADMIN_LOGS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-logs-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Logs",
    page_description: "Inspect site-scoped runtime logs from the current site process.",
    content_label: "Logs content",
    table_label: "Runtime logs",
  },
});

export async function getPhiAdminLogsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_LOGS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    contentLabel: labels.content_label,
    tableLabel: labels.table_label,
  };
}
