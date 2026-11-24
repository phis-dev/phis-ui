import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_APP_RUNTIME_MODULE_IDENTITY } from "../ids";

const PHI_PROFILE_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_APP_RUNTIME_MODULE_IDENTITY, {
  key: "preset:profile-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page: "Profile",
    name: "Name",
    /** The authoring name of the Form beside the name that holds the two telephone numbers. */
    phone: "Telephone numbers",
    language: "Language",
    appearance: "Appearance",
    /*
     * What a panel says when it saved and its Form has no wording of its own -- the language select,
     * which says nothing in place because there is nothing in place to say it in.
     */
    saved: "Saved",
  },
});

export async function getPhiProfilePageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_PAGE_LABEL_SET);
  return {
    page: labels.page,
    name: labels.name,
    phone: labels.phone,
    language: labels.language,
    appearance: labels.appearance,
    saved: labels.saved,
  };
}
