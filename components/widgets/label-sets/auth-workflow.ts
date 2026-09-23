import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import type { PhiAuthWorkflowBodyLabels } from "../label-types/auth-workflow";

/**
 * What the second-factor body says.
 *
 * One set for both callers -- the sign-in step and the App settings surface -- because they render the
 * same component and a second set would be two places to keep one wording in. Sentences and captions
 * are kept apart the way the security set keeps them: `definePhiMessageLabel` for what the Widget says,
 * a plain string for what it labels.
 *
 * The enrolment intro says what to do rather than why it is being asked, which is the one wording that
 * cannot be shared any other way: for a sign-in the factor is required, and in Settings it is a choice.
 */
const PHI_AUTH_WORKFLOW_BODY_LABEL_SET = definePhiLabelSet({
  key: "widget:auth-workflow",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    error_setup_failed: definePhiMessageLabel("Authenticator setup could not be started."),
    error_verify_failed: definePhiMessageLabel("Authentication code could not be verified."),
    recovery_title: definePhiMessageLabel("Authenticator configured"),
    recovery_description: definePhiMessageLabel(
      "Save these recovery codes now. They are shown only once.",
    ),
    recovery_acknowledge: "I saved the recovery codes",
    enroll_title: definePhiMessageLabel("Set up an authenticator app"),
    enroll_intro: definePhiMessageLabel(
      "Scan the code below with your authenticator app, then enter the six-digit code it shows.",
    ),
    enroll_start: "Start setup",
    enroll_code_aria_label: "Authenticator code",
    challenge_title: definePhiMessageLabel("Two-factor authentication"),
    challenge_code_placeholder: "6-digit code",
    challenge_recovery_placeholder: "Recovery code",
    challenge_use_recovery: "Use a recovery code",
    challenge_use_authenticator: "Use authenticator code",
    verify: "Verify and continue",
  },
});

export async function getPhiAuthWorkflowBodyLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiAuthWorkflowBodyLabels> {
  const labels = await getPhiLabelSet(options, PHI_AUTH_WORKFLOW_BODY_LABEL_SET);
  return {
    errors: {
      setupFailed: labels.error_setup_failed,
      verifyFailed: labels.error_verify_failed,
    },
    recovery: {
      title: labels.recovery_title,
      description: labels.recovery_description,
      acknowledge: labels.recovery_acknowledge,
    },
    enroll: {
      title: labels.enroll_title,
      intro: labels.enroll_intro,
      start: labels.enroll_start,
      codeAriaLabel: labels.enroll_code_aria_label,
    },
    challenge: {
      title: labels.challenge_title,
      codePlaceholder: labels.challenge_code_placeholder,
      recoveryPlaceholder: labels.challenge_recovery_placeholder,
      useRecovery: labels.challenge_use_recovery,
      useAuthenticator: labels.challenge_use_authenticator,
    },
    verify: labels.verify,
  };
}
