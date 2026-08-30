import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_REGISTRATION_FORM_LABEL_SET = definePhiLabelSet({
  key: "widget:registration",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    first_name_label: "First name",
    first_name_placeholder: "Jane",
    first_name_required: "Please enter your first name.",
    first_name_min_letters: "First name must contain at least 3 letters.",
    last_name_label: "Last name",
    last_name_placeholder: "Doe",
    last_name_required: "Please enter your last name.",
    last_name_min_letters: "Last name must contain at least 3 letters.",
    company_label: "Company",
    company_placeholder: "Optional",
    email_label: "Email",
    email_placeholder: "you@example.com",
    email_required: "Please enter your email address.",
    email_invalid: "Please enter a valid email address.",
    password_label: "Password",
    password_placeholder: "Choose a secure password",
    password_required: "Please enter a password.",
    password_length: "Use at least 10 characters.",
    confirm_password_label: "Confirm password",
    confirm_password_placeholder: "Repeat your password",
    confirm_password_required: "Please confirm your password.",
    password_mismatch: "The passwords do not match.",
    terms_text: "I agree to the %1",
    terms_link_label: "Terms & Conditions",
    terms_required: "You must accept the terms to continue.",
    newsletter: "Send me product and platform updates.",
    notice: "This form sends a verification email first. The live customer account is created only after confirmation.",
    generic_error: "The registration request could not be completed.",
    account_exists_error: "Account already exists.",
    invalid_credentials_error:
      "The account with this email already exists. Enter the existing account password to attach it to this site.",
    error_title: "Registration failed",
    submit_label: "Create account",
    pending_label: "Preparing request",
    success_title: "Registration request captured",
    success_text: "Your registration request was stored. Check your email and confirm the link to activate the account.",
  },
});

export async function getPhiRegistrationFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_REGISTRATION_FORM_LABEL_SET);
  return {
    fields: {
      firstName: {
        label: labels.first_name_label,
        placeholder: labels.first_name_placeholder,
        required: labels.first_name_required,
        minLetters: labels.first_name_min_letters,
      },
      lastName: {
        label: labels.last_name_label,
        placeholder: labels.last_name_placeholder,
        required: labels.last_name_required,
        minLetters: labels.last_name_min_letters,
      },
      company: {
        label: labels.company_label,
        placeholder: labels.company_placeholder,
      },
      email: {
        label: labels.email_label,
        placeholder: labels.email_placeholder,
        required: labels.email_required,
        invalid: labels.email_invalid,
      },
      password: {
        label: labels.password_label,
        placeholder: labels.password_placeholder,
        required: labels.password_required,
        minLength: labels.password_length,
      },
      confirmPassword: {
        label: labels.confirm_password_label,
        placeholder: labels.confirm_password_placeholder,
        required: labels.confirm_password_required,
        mismatch: labels.password_mismatch,
      },
    },
    consent: {
      termsText: labels.terms_text,
      termsLinkLabel: labels.terms_link_label,
      terms: labels.terms_text,
      termsRequired: labels.terms_required,
      newsletter: labels.newsletter,
    },
    actions: {
      submitLabel: labels.submit_label,
      pendingLabel: labels.pending_label,
    },
    feedback: {
      successTitle: labels.success_title,
      successText: labels.success_text,
      genericError: labels.generic_error,
      accountExistsError: labels.account_exists_error,
      invalidCredentialsError: labels.invalid_credentials_error,
      errorTitle: labels.error_title,
    },
    notice: labels.notice,
  };
}
