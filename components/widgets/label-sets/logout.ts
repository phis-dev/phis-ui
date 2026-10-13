import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiAuthLogoutWidgetLabels } from "../label-types/logout";

/** What the sign-out page says while it signs out, and when it could not. It said it in English only. */
const PHI_AUTH_LOGOUT_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:auth-logout",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    signing_out: definePhiMessageLabel("Signing out..."),
    failed: definePhiMessageLabel("Logout failed."),
    retry: "Try again",
  },
});

export async function getPhiAuthLogoutWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiAuthLogoutWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_AUTH_LOGOUT_WIDGET_LABEL_SET);
  return {
    signingOut: labels.signing_out,
    failed: labels.failed,
    retry: labels.retry,
  };
}
