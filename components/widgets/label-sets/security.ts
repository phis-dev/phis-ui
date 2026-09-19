import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiAuthSecurityWidgetLabels } from "../label-types/security";

/**
 * What the account security Widget says.
 *
 * It said all of it in hard-coded English until now -- on a page about somebody's own account, on a Site
 * that may not be English at all. Sentences and captions are kept apart the way the table's set keeps
 * them: `definePhiMessageLabel` for what the Widget says, a plain string for what it labels.
 */
const PHI_AUTH_SECURITY_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:auth-security",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    intro: definePhiMessageLabel(
      "Manage authenticator apps, linked login providers, and sessions for this site.",
    ),
    error_unavailable: definePhiMessageLabel("Account security is unavailable."),
    error_load_failed: definePhiMessageLabel("Account security could not be loaded."),
    error_csrf_failed: definePhiMessageLabel("Could not initialize authentication session."),
    error_factor_remove_failed: definePhiMessageLabel("Authentication factor could not be removed."),
    error_session_revoke_failed: definePhiMessageLabel("Session could not be revoked."),
    authenticators_title: "Authenticator apps",
    authenticators_add: "Add authenticator",
    authenticators_empty: definePhiMessageLabel("No authenticator configured."),
    authenticators_unnamed: "Authenticator app",
    authenticators_last_used: definePhiMessageLabel("Last used %1"),
    authenticators_never_used: definePhiMessageLabel("Not used yet"),
    authenticators_required: "Required",
    authenticators_remove_confirm: definePhiMessageLabel("Remove this authenticator?"),
    authenticators_remove: "Remove",
    providers_title: "Linked login providers",
    providers_empty: definePhiMessageLabel("No external login provider linked."),
    sessions_title: "Sessions",
    sessions_empty: definePhiMessageLabel("No sessions recorded."),
    sessions_current: "Current session",
    sessions_other: "Session",
    sessions_no_device_details: definePhiMessageLabel("No device details"),
    sessions_revoked: "Revoked",
    sessions_active: "Active",
    sessions_revoke_confirm: definePhiMessageLabel("Revoke this session?"),
    sessions_revoke: "Revoke",
  },
});

export async function getPhiAuthSecurityWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiAuthSecurityWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_AUTH_SECURITY_WIDGET_LABEL_SET);
  return {
    intro: labels.intro,
    errors: {
      unavailable: labels.error_unavailable,
      loadFailed: labels.error_load_failed,
      csrfFailed: labels.error_csrf_failed,
      factorRemoveFailed: labels.error_factor_remove_failed,
      sessionRevokeFailed: labels.error_session_revoke_failed,
    },
    authenticators: {
      title: labels.authenticators_title,
      add: labels.authenticators_add,
      empty: labels.authenticators_empty,
      unnamed: labels.authenticators_unnamed,
      lastUsed: labels.authenticators_last_used,
      neverUsed: labels.authenticators_never_used,
      required: labels.authenticators_required,
      removeConfirm: labels.authenticators_remove_confirm,
      remove: labels.authenticators_remove,
    },
    providers: {
      title: labels.providers_title,
      empty: labels.providers_empty,
    },
    sessions: {
      title: labels.sessions_title,
      empty: labels.sessions_empty,
      current: labels.sessions_current,
      other: labels.sessions_other,
      noDeviceDetails: labels.sessions_no_device_details,
      revoked: labels.sessions_revoked,
      active: labels.sessions_active,
      revokeConfirm: labels.sessions_revoke_confirm,
      revoke: labels.sessions_revoke,
    },
  };
}
