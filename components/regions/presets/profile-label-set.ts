import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_PROFILE_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:profile-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page: "Profile",
    overview: "Overview",
    name: "Name",
    language: "Language",
    email: "Email",
    password: "Password",
    address: "Address",
  },
});

export async function getPhiProfilePageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_PAGE_LABEL_SET);
  return {
    page: labels.page,
    overview: labels.overview,
    name: labels.name,
    language: labels.language,
    email: labels.email,
    password: labels.password,
    address: labels.address,
  };
}
