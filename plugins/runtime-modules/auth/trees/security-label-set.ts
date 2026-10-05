import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_AUTH_RUNTIME_MODULE_IDENTITY } from "../ids";

const PHI_SECURITY_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_AUTH_RUNTIME_MODULE_IDENTITY, {
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
