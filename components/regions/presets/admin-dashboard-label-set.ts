import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the page says, which is now all it says.
 *
 * The figures moved out with the cards: a card's own words belong to the Module that offers it, and a
 * label set here would have been this page translating on three other Modules' behalf.
 */
const PHI_ADMIN_DASHBOARD_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-dashboard-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Dashboard",
    page_description: definePhiMessageLabel("Review the current site status and core runtime counters at a glance."),
    empty_description: "No module offers a card here yet.",
  },
});

export async function getPhiAdminDashboardPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_DASHBOARD_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    emptyDescription: labels.empty_description,
  };
}
