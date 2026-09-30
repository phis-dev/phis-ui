import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the unsubscribe page says, in the language the mail was read in.
 *
 * Short by design: the page exists to be left, not read. The error carries the one thing worth saying about
 * a link that no longer holds -- that a newer mail has a newer link -- because the alternative is somebody
 * concluding they cannot get out.
 */
const PHI_UNSUBSCRIBE_FORM_LABEL_SET = definePhiLabelSet({
  key: "widget:unsubscribe-form",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    token_required: definePhiMessageLabel("This unsubscribe link is incomplete."),
    generic_error: definePhiMessageLabel(
      "This link is no longer valid. The most recent message carries a working one.",
    ),
    submit_label: "Unsubscribe",
    success_title: "Unsubscribed",
    success_text: definePhiMessageLabel(
      "You will not receive further updates from this site. A message already on its way may still arrive.",
    ),
  },
});

export async function getPhiUnsubscribeFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_UNSUBSCRIBE_FORM_LABEL_SET);
  return {
    fields: {
      token: {
        required: labels.token_required,
      },
    },
    actions: {
      submitLabel: labels.submit_label,
    },
    feedback: {
      successTitle: labels.success_title,
      successText: labels.success_text,
      genericError: labels.generic_error,
    },
  };
}
