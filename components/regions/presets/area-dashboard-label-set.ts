import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the Dashboards that were not written for one Area say.
 *
 * The per-Area sentence used to travel as an English string in the route template and reach the page
 * as a card's `description`, translated on the way out because the card translates its own text. The
 * card is gone -- the page places a Collection over the contributions now, like Admin -- so the
 * sentence moved here rather than becoming the one untranslated line on the page.
 *
 * One key per Area rather than a lookup by name, because a label set's keys are what a translator sees
 * and a computed key is a message nobody can find.
 */
const PHI_AREA_DASHBOARD_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:area-dashboard-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Dashboard",
    app_description: definePhiMessageLabel("Everything this site makes available to you once you are signed in."),
    accounting_description: definePhiMessageLabel("Invoices and billing workflows for this site."),
    editor_description: definePhiMessageLabel("Content and translation work for this site."),
    empty_description: "No module offers a card here yet.",
  },
});

/** The Areas that take the generic Dashboard. Admin and Builder each have one written for them. */
export type PhiAreaDashboardKey = "app" | "accounting" | "editor";

export async function getPhiAreaDashboardPageLabels(
  options: PhiGlobalTranslatorOptions,
  area: PhiAreaDashboardKey,
) {
  const labels = await getPhiLabelSet(options, PHI_AREA_DASHBOARD_PAGE_LABEL_SET);
  const descriptionByArea = {
    app: labels.app_description,
    accounting: labels.accounting_description,
    editor: labels.editor_description,
  } as const satisfies Record<PhiAreaDashboardKey, string>;
  return {
    pageTitle: labels.page_title,
    pageDescription: descriptionByArea[area],
    emptyDescription: labels.empty_description,
  };
}
