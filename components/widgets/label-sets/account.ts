import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ACCOUNT_MENU_LABEL_SET = definePhiLabelSet({
  key: "widget:account-menu",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    account: "Account",
    login: "Login",
    register: "Register",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
  },
});

const PHI_LOGIN_MODAL_LABEL_SET = definePhiLabelSet({
  key: "widget:login-modal",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Login",
    email_label: "Email",
    password_label: "Password",
    forgot_password_label: "Forgot password?",
    email_required: "Please enter your email.",
    email_invalid: "Please enter a valid email address.",
    password_required: "Please enter your password.",
    error_init_session: "Could not initialize login session.",
    error_account_disabled: "Your account is disabled. Please contact support.",
    error_invalid_credentials: "Invalid credentials.",
    error_login_failed: "Login failed.",
    error_network: "Network error while logging in.",
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
      logout: labels.logout,
    },
  };
}

export async function getPhiLoginFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_LOGIN_MODAL_LABEL_SET);
  return {
    title: labels.title,
    actions: {
      submitLabel: labels.title,
      forgotPasswordLabel: labels.forgot_password_label,
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

export const getPhiAccountLoginModalLabels = getPhiLoginFormLabels;
