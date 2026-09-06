import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_PROFILE_LOCALE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-locale",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Language",
    description: definePhiMessageLabel("Choose your preferred language for this site."),
    field_label: "Default language",
    current_label: "Current language",
    submit_label: "Save",
    error_title: "Language update failed",
    error_network: definePhiMessageLabel("Network error while updating your language."),
    error_invalid_locale: definePhiMessageLabel("Please choose a language that is available on this site."),
    error_generic: definePhiMessageLabel("The language update could not be completed."),
    success_title: "Language updated",
    success_text: definePhiMessageLabel("Your preferred language has been saved."),
  },
});

const PHI_PROFILE_NAME_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-name",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Name",
    description: definePhiMessageLabel("Update your first name, last name, and company."),
    first_name_label: "First name",
    last_name_label: "Last name",
    company_label: "Company",
    current_label: "Current name",
    submit_label: "Save",
    error_title: "Name update failed",
    error_network: definePhiMessageLabel("Network error while updating your name."),
    error_generic: definePhiMessageLabel("The name update could not be completed."),
    success_title: "Name updated",
    success_text: definePhiMessageLabel("Your profile details have been saved."),
  },
});

const PHI_PROFILE_OVERVIEW_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-overview",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Overview",
    description: definePhiMessageLabel("Manage your account details and site preferences from one place."),
    account_label: "Account",
    newsletter_label: "Newsletter",
    newsletter_description: definePhiMessageLabel("Receive product and platform updates for this site."),
    newsletter_on: "Enabled",
    newsletter_off: "Disabled",
    error_title: "Newsletter update failed",
    error_network: definePhiMessageLabel("Network error while updating your newsletter preference."),
    error_generic: definePhiMessageLabel("The newsletter preference could not be updated."),
    success_title: "Newsletter updated",
    success_text: definePhiMessageLabel("Your newsletter preference has been saved."),
  },
});

export async function getPhiProfileLocaleWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_LOCALE_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    fieldLabel: labels.field_label,
    currentLabel: labels.current_label,
    submitLabel: labels.submit_label,
    feedback: {
      errorTitle: labels.error_title,
      errorNetwork: labels.error_network,
      errorInvalidLocale: labels.error_invalid_locale,
      errorGeneric: labels.error_generic,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}

export async function getPhiProfileNameWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_NAME_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    fields: {
      firstName: labels.first_name_label,
      lastName: labels.last_name_label,
      companyName: labels.company_label,
    },
    currentLabel: labels.current_label,
    submitLabel: labels.submit_label,
    feedback: {
      errorTitle: labels.error_title,
      errorNetwork: labels.error_network,
      errorGeneric: labels.error_generic,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}

export async function getPhiProfileOverviewWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_OVERVIEW_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    accountLabel: labels.account_label,
    newsletterLabel: labels.newsletter_label,
    newsletterDescription: labels.newsletter_description,
    newsletterOn: labels.newsletter_on,
    newsletterOff: labels.newsletter_off,
    feedback: {
      errorTitle: labels.error_title,
      errorNetwork: labels.error_network,
      errorGeneric: labels.error_generic,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}

const PHI_PROFILE_EMAIL_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-email",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Email",
    description: definePhiMessageLabel("Change your email address. We will send a verification link to the new address."),
    current_label: "Current email",
    email_label: "New email",
    password_label: "Current password",
    submit_label: "Save",
    error_title: "Email update failed",
    error_network: definePhiMessageLabel("Network error while updating your email."),
    error_invalid_email: definePhiMessageLabel("Please enter a valid email address."),
    error_missing_password: definePhiMessageLabel("Please enter your current password."),
    error_invalid_credentials: definePhiMessageLabel("Invalid credentials."),
    error_conflict: definePhiMessageLabel("This email address is already in use."),
    error_generic: definePhiMessageLabel("The email update could not be completed."),
    success_title: "Verification email sent",
    success_text: definePhiMessageLabel("Check the new email address and confirm the link to activate it."),
    success_unchanged_title: "Email unchanged",
    success_unchanged_text: definePhiMessageLabel("The entered email is already your current email address."),
  },
});

export async function getPhiProfileEmailWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_EMAIL_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    currentLabel: labels.current_label,
    fields: {
      email: labels.email_label,
      password: labels.password_label,
    },
    submitLabel: labels.submit_label,
    feedback: {
      errorTitle: labels.error_title,
      errorNetwork: labels.error_network,
      errorInvalidEmail: labels.error_invalid_email,
      errorMissingPassword: labels.error_missing_password,
      errorInvalidCredentials: labels.error_invalid_credentials,
      errorConflict: labels.error_conflict,
      errorGeneric: labels.error_generic,
      successTitle: labels.success_title,
      successText: labels.success_text,
      successUnchangedTitle: labels.success_unchanged_title,
      successUnchangedText: labels.success_unchanged_text,
    },
  };
}

const PHI_PROFILE_PASSWORD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-password",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Password",
    description: definePhiMessageLabel("Change your password by confirming your current one first."),
    current_label: "Current password",
    new_label: "New password",
    confirm_label: "Confirm new password",
    submit_label: "Save",
    error_title: "Password update failed",
    error_network: definePhiMessageLabel("Network error while updating your password."),
    error_missing_current_password: definePhiMessageLabel("Please enter your current password."),
    error_missing_new_password: definePhiMessageLabel("Please enter a new password."),
    error_invalid_credentials: definePhiMessageLabel("Invalid credentials."),
    error_password_short: definePhiMessageLabel("Password is too short."),
    error_password_mismatch: definePhiMessageLabel("Passwords do not match."),
    error_generic: definePhiMessageLabel("The password update could not be completed."),
    success_title: "Password updated",
    success_text: definePhiMessageLabel("Your password has been changed. Please sign in again with the new password."),
  },
});

export async function getPhiProfilePasswordWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_PASSWORD_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    fields: {
      currentPassword: labels.current_label,
      newPassword: labels.new_label,
      confirmPassword: labels.confirm_label,
    },
    submitLabel: labels.submit_label,
    feedback: {
      errorTitle: labels.error_title,
      errorNetwork: labels.error_network,
      errorMissingCurrentPassword: labels.error_missing_current_password,
      errorMissingNewPassword: labels.error_missing_new_password,
      errorInvalidCredentials: labels.error_invalid_credentials,
      errorPasswordShort: labels.error_password_short,
      errorPasswordMismatch: labels.error_password_mismatch,
      errorGeneric: labels.error_generic,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}
