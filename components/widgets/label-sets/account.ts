import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ACCOUNT_MENU_LABEL_SET = definePhiLabelSet({
  key: "widget:account-menu",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    account: "Account",
    login: "Login",
    register: "Register",
    profile: "Profile",
    settings: "Settings",
  },
});

const PHI_LOGIN_MODAL_LABEL_SET = definePhiLabelSet({
  key: "widget:login-modal",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Login",
    submit_label: "Sign in",
    email_label: "Email",
    password_label: "Password",
    forgot_password_label: "Forgot password",
    register_label: "Create account",
    email_required: definePhiMessageLabel("Please enter your email."),
    email_invalid: definePhiMessageLabel("Please enter a valid email address."),
    password_required: definePhiMessageLabel("Please enter your password."),
    error_init_session: definePhiMessageLabel("Could not initialize login session."),
    error_account_disabled: definePhiMessageLabel("Your account is disabled. Please contact support."),
    error_invalid_credentials: definePhiMessageLabel("Invalid credentials."),
    error_login_failed: definePhiMessageLabel("Login failed."),
    error_network: definePhiMessageLabel("Network error while logging in."),
    methods_separator: "Or continue with",
    provider_link_title: "Confirm your existing account",
    provider_link_text: definePhiMessageLabel("The provider verified an email address that already belongs to an account here. Enter that account's password once to link the two."),
    provider_link_password_label: "Password",
    provider_link_password_required: definePhiMessageLabel("Enter your existing account password."),
    provider_link_submit_label: "Link account and sign in",
    error_method_failed: definePhiMessageLabel("Authentication could not be started."),
    error_method_unavailable: definePhiMessageLabel("Could not initialize the sign-in session."),
  },
});

export async function getPhiAccountMenuLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ACCOUNT_MENU_LABEL_SET);
  return {
    trigger: {
      account: labels.account,
    },
    guest: {
      login: labels.login,
      register: labels.register,
    },
    authenticated: {
      profile: labels.profile,
      settings: labels.settings,
    },
  };
}

export async function getPhiLoginFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_LOGIN_MODAL_LABEL_SET);
  return {
    title: labels.title,
    actions: {
      submitLabel: labels.submit_label,
      forgotPasswordLabel: labels.forgot_password_label,
      registerLabel: labels.register_label,
    },
    fields: {
      email: {
        label: labels.email_label,
        required: labels.email_required,
        invalid: labels.email_invalid,
      },
      password: {
        label: labels.password_label,
        required: labels.password_required,
      },
    },
    errors: {
      accountDisabled: labels.error_account_disabled,
      initSession: labels.error_init_session,
      invalidCredentials: labels.error_invalid_credentials,
      loginFailed: labels.error_login_failed,
      network: labels.error_network,
    },
  };
}

/**
 * The second form on the Login page, for the visitor an external provider has just identified.
 *
 * It is its own form because it asks its own question -- one password, for an account that already
 * exists -- and it is reached only by coming back from a provider with `?auth=link_required`.
 */
export async function getPhiProviderLinkConfirmationFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_LOGIN_MODAL_LABEL_SET);
  return {
    providerLink: {
      passwordLabel: labels.provider_link_password_label,
      passwordRequired: labels.provider_link_password_required,
    },
    actions: {
      submitLabel: labels.provider_link_submit_label,
    },
  };
}

/** What the row of external providers says, which is not the form's business and not its label set. */
export async function getPhiAuthMethodsLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_LOGIN_MODAL_LABEL_SET);
  return {
    separator: labels.methods_separator,
    failed: labels.error_method_failed,
    unavailable: labels.error_method_unavailable,
  };
}

export const getPhiAccountLoginModalLabels = getPhiLoginFormLabels;
