import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What the Core Runtime Controller says about a session it was asked to end.
 *
 * Only the failure: a sign-out that worked is answered by the fresh document that follows it, and
 * one that did not must say so -- the person asked to be signed out and is still signed in.
 */
const PHI_SESSION_LABEL_SET = definePhiLabelSet({
  key: "runtime:session",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    sign_out_failed: definePhiMessageLabel("You could not be signed out. Please try again."),
  },
});

export type PhiSessionLabels = {
  signOutFailed: string;
};

export async function getPhiSessionLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiSessionLabels> {
  const labels = await getPhiLabelSet(options, PHI_SESSION_LABEL_SET);
  return { signOutFailed: labels.sign_out_failed };
}
