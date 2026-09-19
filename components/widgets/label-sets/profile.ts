import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_PROFILE_LOCALE_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-locale",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    description: definePhiMessageLabel("Choose your preferred language for this site."),
    field_label: "Default language",
    submit_label: "Save",
    error_invalid_locale: definePhiMessageLabel("Please choose a language that is available on this site."),
    success_title: "Language updated",
    success_text: definePhiMessageLabel("Your preferred language has been saved."),
  },
});

const PHI_PROFILE_THEME_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-theme",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    description: definePhiMessageLabel("Choose whether this site appears light or dark for you."),
    field_label: "Appearance",
    /*
     * "System" is what the third option answers, and it is deliberately not called "Automatic": what
     * follows is a setting on the person's own device, and saying so is what makes the option findable
     * when somebody wonders why the site changed at sunset.
     */
    mode_system: "System",
    mode_light: "Light",
    mode_dark: "Dark",
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
    description: labels.description,
    fieldLabel: labels.field_label,
    submitLabel: labels.submit_label,
    feedback: {
      errorInvalidLocale: labels.error_invalid_locale,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}

export async function getPhiProfileThemeWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_THEME_WIDGET_LABEL_SET);
  return {
    description: labels.description,
    fieldLabel: labels.field_label,
    modes: {
      system: labels.mode_system,
      light: labels.mode_light,
      dark: labels.mode_dark,
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
    description: definePhiMessageLabel("Change your email address. We will send a verification link to the new address."),
    current_label: "Current email",
    email_label: "New email",
    password_label: "Current password",
    submit_label: "Save",
    error_invalid_email: definePhiMessageLabel("Please enter a valid email address."),
    error_missing_password: definePhiMessageLabel("Please enter your current password."),
    success_title: "Verification email sent",
    success_text: definePhiMessageLabel("If that address differs from your current one, a confirmation link is on its way to it."),
  },
});

export async function getPhiProfileEmailWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_EMAIL_WIDGET_LABEL_SET);
  return {
    description: labels.description,
    currentLabel: labels.current_label,
    fields: {
      email: labels.email_label,
      password: labels.password_label,
    },
    submitLabel: labels.submit_label,
    feedback: {
      errorInvalidEmail: labels.error_invalid_email,
      errorMissingPassword: labels.error_missing_password,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}

/**
 * The same labels, shaped for the Form that renders them.
 *
 * A Form descriptor names its labels by path -- `fields.email`, `feedback.successTitle` -- and reads
 * them from one flattened set, so what the Widget returned as nested objects is what the Form asks for
 * under those names. Nothing is translated twice: one label set, two readers.
 */
export async function getPhiProfileEmailFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiProfileEmailWidgetLabels(options);
  return {
    fields: labels.fields,
    actions: { submitLabel: labels.submitLabel },
    feedback: {
      errorInvalidEmail: labels.feedback.errorInvalidEmail,
      errorMissingPassword: labels.feedback.errorMissingPassword,
      successTitle: labels.feedback.successTitle,
      successText: labels.feedback.successText,
    },
  };
}

const PHI_PROFILE_PASSWORD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:profile-password",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    description: definePhiMessageLabel("Change your password by confirming your current one first."),
    current_label: "Current password",
    new_label: "New password",
    confirm_label: "Confirm new password",
    submit_label: "Save",
    error_missing_current_password: definePhiMessageLabel("Please enter your current password."),
    error_missing_new_password: definePhiMessageLabel("Please enter a new password."),
    error_password_short: definePhiMessageLabel("Password is too short."),
    error_password_mismatch: definePhiMessageLabel("Passwords do not match."),
    success_title: "Password updated",
    success_text: definePhiMessageLabel("Your password has been changed. Everywhere else you were signed in has been signed out."),
  },
});

export async function getPhiProfilePasswordWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_PROFILE_PASSWORD_WIDGET_LABEL_SET);
  return {
    description: labels.description,
    fields: {
      currentPassword: labels.current_label,
      newPassword: labels.new_label,
      confirmPassword: labels.confirm_label,
    },
    submitLabel: labels.submit_label,
    feedback: {
      errorMissingCurrentPassword: labels.error_missing_current_password,
      errorMissingNewPassword: labels.error_missing_new_password,
      errorPasswordShort: labels.error_password_short,
      errorPasswordMismatch: labels.error_password_mismatch,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}

/** The password labels under the paths its Form descriptor names them by. See the email one above. */
export async function getPhiProfilePasswordFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiProfilePasswordWidgetLabels(options);
  return {
    fields: labels.fields,
    actions: { submitLabel: labels.submitLabel },
    feedback: labels.feedback,
  };
}
