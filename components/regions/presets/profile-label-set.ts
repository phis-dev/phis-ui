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
    appearance: "Appearance",
    /*
     * The panel is named after what it collects, not after the one switch in it today. A panel titled
     * "Newsletter" holding a switch labelled "Newsletter" says the same word twice and has room for
     * nothing else; named for the subject, a second thing somebody can subscribe to moves in beside
     * the first without renaming anything.
     */
    subscriptions: "Subscriptions",
    /** The switch's own subject, and the authoring name of the Form that holds it. */
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
    appearance: labels.appearance,
    subscriptions: labels.subscriptions,
    newsletter: labels.newsletter,
    save: labels.save,
    saved: labels.saved,
  };
}
