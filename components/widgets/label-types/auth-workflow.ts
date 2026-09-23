/**
 * What the second-factor body says, in the language it is read in.
 *
 * It said all of it in hard-coded English, which was noticed the moment the body stopped taking a whole
 * workflow: one sentence had been written for a sign-in that could not continue without a factor, and
 * the App settings surface showed it to people who were adding an authenticator because they wanted one.
 * A shared component with literal copy tells whichever caller it has least in common with the wrong
 * thing, and it does so in one language.
 *
 * Grouped by the three things this body can be: reporting recovery codes, setting a device up, and
 * asking for a code. `verify` is shared because the button says the same thing in two of them.
 */
export type PhiAuthWorkflowBodyLabels = {
  errors: {
    setupFailed: string;
    verifyFailed: string;
  };
  /** Shown once a device is confirmed and the account has codes to keep. */
  recovery: {
    title: string;
    description: string;
    acknowledge: string;
  };
  enroll: {
    title: string;
    intro: string;
    start: string;
    codeAriaLabel: string;
  };
  challenge: {
    title: string;
    codePlaceholder: string;
    recoveryPlaceholder: string;
    useRecovery: string;
    useAuthenticator: string;
  };
  verify: string;
};
