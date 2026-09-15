import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_CONFIRM_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:confirm",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    confirm_label: "Confirm",
    token_required: definePhiMessageLabel("Confirmation token is required."),
    success_title: "Confirmed",
    success_text: definePhiMessageLabel("Your registration has been confirmed."),
    already_title: "Already Confirmed",
    already_text: definePhiMessageLabel("This registration has already been confirmed."),
    invalid_title: "Invalid Link",
    invalid_text: definePhiMessageLabel("This confirmation link is invalid."),
    expired_title: "Expired Link",
    expired_text: definePhiMessageLabel("This confirmation link has expired."),
    generic_error_title: "Confirmation Failed",
    generic_error_text: definePhiMessageLabel("The confirmation could not be completed."),
    details_title: "Details",
    name_label: "Name",
    email_label: "Email",
    company_label: "Company",
  },
});

/**
 * The confirmation, told to two Widgets: the form that confirms and the preview beside it.
 *
 * `fields`, `actions` and `feedback` are what every form reads. `preview` is what the Form Preview reads
 * -- a label per field the preview phase returns, and a title and text per outcome it can report, under
 * the outcome's own name so that no translation stands between the answer and the label for it.
 */
export async function getPhiConfirmFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_CONFIRM_WIDGET_LABEL_SET);

  return {
    fields: {
      token: {
        required: labels.token_required,
      },
    },
    actions: {
      submitLabel: labels.confirm_label,
    },
    feedback: {
      successTitle: labels.success_title,
      successText: labels.success_text,
      errorTitle: labels.generic_error_title,
      errorText: labels.generic_error_text,
    },
    preview: {
      title: labels.details_title,
      fields: {
        fullName: labels.name_label,
        firstName: labels.name_label,
        lastName: labels.name_label,
        email: labels.email_label,
        companyName: labels.company_label,
      },
      status: {
        already_confirmed: { title: labels.already_title, text: labels.already_text },
        expired: { title: labels.expired_title, text: labels.expired_text },
        invalid_token: { title: labels.invalid_title, text: labels.invalid_text },
        invalid_state: { title: labels.invalid_title, text: labels.invalid_text },
        error: { title: labels.generic_error_title, text: labels.generic_error_text },
      },
    },
  };
}
