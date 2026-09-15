import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_RESET_PASSWORD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:reset-password",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    request_email_label: "Email",
    request_email_placeholder: "you@example.com",
    request_email_required: definePhiMessageLabel("Please enter your email address."),
    request_email_invalid: definePhiMessageLabel("Please enter a valid email address."),
    request_submit_label: "Send reset link",
    request_pending_label: "Sending reset link",
    request_intro_text: definePhiMessageLabel("If the account exists, a reset email is on its way. Open the link in that email to choose a new password."),
    request_success_title: "Reset link sent",
    request_error_title: "Reset request failed",
    request_error_text: definePhiMessageLabel("The reset request could not be completed."),
    confirm_token_required: definePhiMessageLabel("The reset token is required."),
    confirm_password_label: "New password",
    confirm_password_placeholder: "Choose a secure password",
    confirm_password_required: definePhiMessageLabel("Please enter a new password."),
    confirm_password_length: definePhiMessageLabel("Use at least 10 characters."),
    confirm_password_confirm_label: "Confirm new password",
    confirm_password_confirm_placeholder: "Repeat your new password",
    confirm_password_confirm_required: definePhiMessageLabel("Please confirm the new password."),
    confirm_password_mismatch: definePhiMessageLabel("The passwords do not match."),
    confirm_submit_label: "Update password",
    confirm_pending_label: "Updating password",
    confirm_success_title: "Password updated",
    confirm_success_text: definePhiMessageLabel("Your password was updated successfully. You can now return to the homepage and log in with the new password."),
    confirm_error_title: "Password update failed",
    confirm_error_text: definePhiMessageLabel("The password could not be updated."),
  },
});

/*
 * One set of sentences, read by two forms.
 *
 * Asking for a reset and spending the link that arrives are two forms with no field in common, and each
 * reads its own labels under the same names any other form uses -- `fields`, `actions`, `feedback`. They
 * share the message set because they are one story told to one person, and translating "Email" twice
 * would be two msgIds for one word.
 */
export async function getPhiResetPasswordRequestFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_RESET_PASSWORD_WIDGET_LABEL_SET);
  return {
    fields: {
      email: {
        label: labels.request_email_label,
        placeholder: labels.request_email_placeholder,
        required: labels.request_email_required,
        invalid: labels.request_email_invalid,
      },
    },
    actions: {
      submitLabel: labels.request_submit_label,
    },
    feedback: {
      introText: labels.request_intro_text,
      successTitle: labels.request_success_title,
      successText: labels.request_intro_text,
      errorTitle: labels.request_error_title,
      errorText: labels.request_error_text,
    },
  };
}

export async function getPhiResetPasswordConfirmFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_RESET_PASSWORD_WIDGET_LABEL_SET);
  return {
    fields: {
      token: {
        required: labels.confirm_token_required,
      },
      password: {
        label: labels.confirm_password_label,
        placeholder: labels.confirm_password_placeholder,
        required: labels.confirm_password_required,
        minLength: labels.confirm_password_length,
      },
      confirmPassword: {
        label: labels.confirm_password_confirm_label,
        placeholder: labels.confirm_password_confirm_placeholder,
        required: labels.confirm_password_confirm_required,
        mismatch: labels.confirm_password_mismatch,
      },
    },
    actions: {
      submitLabel: labels.confirm_submit_label,
    },
    feedback: {
      successTitle: labels.confirm_success_title,
      successText: labels.confirm_success_text,
      errorTitle: labels.confirm_error_title,
      errorText: labels.confirm_error_text,
    },
  };
}
