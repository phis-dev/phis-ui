import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_SECURITY_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:security-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page: "Security",
    password: "Password",
    email: "Email",
    sessions: "Authenticators and sessions",
  },
});

export async function getPhiSecurityPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_SECURITY_PAGE_LABEL_SET);
  return {
    page: labels.page,
    password: labels.password,
    email: labels.email,
    sessions: labels.sessions,
  };
}
