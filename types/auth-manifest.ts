/**
 * What the Site says about signing in, before anybody tries.
 *
 * Which methods a Login offers is Site configuration, not viewer state, so it is known while the page
 * is being rendered. It lives here rather than beside the widget that draws it because the server
 * helper that reads it and the client component that uses it must agree on one shape, and a type in a
 * `"use client"` module would drag that module into the server graph to get it.
 */
export type PhiPublicAuthManifest = {
  version: 1;
  registrationMode: "disabled" | "invite-only" | "automatic";
  methods: Array<{
    methodKey: string;
    stage: "primary" | "second-factor" | "step-up" | "recovery";
    label: string;
    icon?: string;
    startPath: string;
  }>;
};

/** An authentication that has begun and is not finished: a second factor asked for, or enrolled. */
export type PhiAuthWorkflow = {
  state: "factor-enrollment-required" | "factor-challenge-required" | "complete";
  methodKey: "totp" | null;
  next: string;
};
