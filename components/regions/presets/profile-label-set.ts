import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_PROFILE_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:profile-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page: "Profile",
    name: "Name",
    language: "Language",
    newsletter: "Newsletter",
    save: "Save",
    /*
     * What a panel says when it saved and its Form has no wording of its own -- the language select
     * and the newsletter switch, which say nothing in place because there is nothing in place to say
     * it in.
     */
    saved: "Saved",
  },
});

export async function getPhiProfilePageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_PAGE_LABEL_SET);
  return {
    page: labels.page,
    name: labels.name,
    language: labels.language,
    newsletter: labels.newsletter,
    save: labels.save,
    saved: labels.saved,
  };
}
