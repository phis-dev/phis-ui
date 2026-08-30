import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_CONFIRM_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:confirm",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    confirm_label: "Confirm",
    pending_label: "Confirming",
    success_title: "Confirmed",
    success_text: "Your registration has been confirmed.",
    already_title: "Already Confirmed",
    already_text: "This registration has already been confirmed.",
    invalid_title: "Invalid Link",
    invalid_text: "This confirmation link is invalid.",
    expired_title: "Expired Link",
    expired_text: "This confirmation link has expired.",
    generic_error_title: "Confirmation Failed",
    generic_error_text: "The confirmation could not be completed.",
    details_title: "Details",
    name_label: "Name",
    email_label: "Email",
    company_label: "Company",
    pending_intro: "Review the registration details before confirming.",
    already_intro: "This registration has already been confirmed.",
    missing_token_title: "Missing Token",
    missing_token_text: "No confirmation token was provided.",
    login_label: "Login",
    back_label: "Back",
  },
});

export async function getPhiConfirmWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_CONFIRM_WIDGET_LABEL_SET);

  return {
    confirmLabel: labels.confirm_label,
    pendingLabel: labels.pending_label,
    successTitle: labels.success_title,
    successText: labels.success_text,
    alreadyTitle: labels.already_title,
    alreadyText: labels.already_text,
    invalidTitle: labels.invalid_title,
    invalidText: labels.invalid_text,
    expiredTitle: labels.expired_title,
    expiredText: labels.expired_text,
    genericErrorTitle: labels.generic_error_title,
    genericErrorText: labels.generic_error_text,
    detailsTitle: labels.details_title,
    nameLabel: labels.name_label,
    emailLabel: labels.email_label,
    companyLabel: labels.company_label,
    pendingIntro: labels.pending_intro,
    alreadyIntro: labels.already_intro,
    missingTokenTitle: labels.missing_token_title,
    missingTokenText: labels.missing_token_text,
    loginLabel: labels.login_label,
    backLabel: labels.back_label,
  };
}
