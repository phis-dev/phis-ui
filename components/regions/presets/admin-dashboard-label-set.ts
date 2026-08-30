import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ADMIN_DASHBOARD_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-dashboard-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Dashboard",
    page_description: "Review the current site status and core runtime counters at a glance.",
    runtime_eyebrow: "Runtime",
    uptime_title: "Server uptime",
    uptime_description: "Server process uptime",
    uptime_meta: "Running on the current worker",
    accounts_eyebrow: "Accounts",
    accounts_title: "Site users",
    accounts_description: "User accounts on this site",
    accounts_meta: "Admin, editor, accounting, auth, and shop accounts",
    locale_eyebrow: "Locale",
    locale_title: "Current locale",
    locale_description: "Resolved request locale",
    locale_meta: "Resolved from request, profile, cookie, browser, or Site fallback",
    locales_eyebrow: "Locales",
    locales_title: "Available locales",
    locales_description: "Locales configured for this site",
    locales_meta: "%1 configured locales",
  },
});

export async function getPhiAdminDashboardPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_DASHBOARD_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    runtimeEyebrow: labels.runtime_eyebrow,
    uptimeTitle: labels.uptime_title,
    uptimeDescription: labels.uptime_description,
    uptimeMeta: labels.uptime_meta,
    accountsEyebrow: labels.accounts_eyebrow,
    accountsTitle: labels.accounts_title,
    accountsDescription: labels.accounts_description,
    accountsMeta: labels.accounts_meta,
    localeEyebrow: labels.locale_eyebrow,
    localeTitle: labels.locale_title,
    localeDescription: labels.locale_description,
    localeMeta: labels.locale_meta,
    localesEyebrow: labels.locales_eyebrow,
    localesTitle: labels.locales_title,
    localesDescription: labels.locales_description,
    localesMeta: labels.locales_meta,
  };
}
