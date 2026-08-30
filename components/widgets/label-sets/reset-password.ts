import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_RESET_PASSWORD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:reset-password",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    request_email_label: "Email",
    request_email_placeholder: "you@example.com",
    request_email_required: "Please enter your email address.",
    request_email_invalid: "Please enter a valid email address.",
    request_submit_label: "Send reset link",
    request_pending_label: "Sending reset link",
    request_intro_text: "If the account exists, a reset email is on its way. Open the link in that email to choose a new password.",
    request_success_title: "Reset link sent",
    request_error_title: "Reset request failed",
    request_error_text: "The reset request could not be completed.",
    confirm_token_label: "Reset token",
    confirm_token_required: "The reset token is required.",
    confirm_password_label: "New password",
    confirm_password_placeholder: "Choose a secure password",
    confirm_password_required: "Please enter a new password.",
    confirm_password_length: "Use at least 10 characters.",
    confirm_password_confirm_label: "Confirm new password",
    confirm_password_confirm_placeholder: "Repeat your new password",
    confirm_password_confirm_required: "Please confirm the new password.",
    confirm_password_mismatch: "The passwords do not match.",
    confirm_submit_label: "Update password",
    confirm_pending_label: "Updating password",
    confirm_success_title: "Password updated",
    confirm_success_text: "Your password was updated successfully. You can now return to the homepage and log in with the new password.",
    confirm_error_title: "Password update failed",
    confirm_error_text: "The password could not be updated.",
  },
});

export async function getPhiResetPasswordWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_RESET_PASSWORD_WIDGET_LABEL_SET);
  return {
    request: {
      email: {
        label: labels.request_email_label,
        placeholder: labels.request_email_placeholder,
        required: labels.request_email_required,
        invalid: labels.request_email_invalid,
      },
      submitLabel: labels.request_submit_label,
      pendingLabel: labels.request_pending_label,
      introText: labels.request_intro_text,
      success: {
        title: labels.request_success_title,
        text: labels.request_intro_text,
      },
      error: {
        title: labels.request_error_title,
        text: labels.request_error_text,
      },
    },
    confirm: {
      token: {
        label: labels.confirm_token_label,
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
      submitLabel: labels.confirm_submit_label,
      pendingLabel: labels.confirm_pending_label,
      success: {
        title: labels.confirm_success_title,
        text: labels.confirm_success_text,
      },
      error: {
        title: labels.confirm_error_title,
        text: labels.confirm_error_text,
      },
    },
  };
}
