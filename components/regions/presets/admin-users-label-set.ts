import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ADMIN_USERS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-users-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Users",
    page_description: "Manage local site users, roles, access, and login history.",
    content_label: "Users content",
    table_label: "Users table",
  },
});

export async function getPhiAdminUsersPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_USERS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    contentLabel: labels.content_label,
    tableLabel: labels.table_label,
  };
}
