"use client";

import { useRef, useState } from "react";
import { PhiAlertControl } from "../controls/phi-alert-control";

import { PHI_COLOR, PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiFormDescriptor } from "../../types/form-descriptor";
import { PhiLink } from "../navigation/phi-link";
import type { PhiSubmitFormProps } from "./contracts";
import { PhiFormControl, type PhiFormControlHandle } from "../controls/phi-form-control";
import { PhiButtonControl } from "../controls/phi-button-control";
import { flattenPhiFormLabels } from "./form-labels";
import { PHI_LOGIN_FORM_DESCRIPTOR } from "./shared-form-descriptors";

export type LoginFormLabels = {
  title?: string;
  actions?: { submitLabel?: string; forgotPasswordLabel?: string; registerLabel?: string };
  fields?: {
    email?: { label?: string; required?: string; invalid?: string };
    password?: { label?: string; required?: string };
  };
  errors?: {
    accountDisabled?: string;
    initSession?: string;
    invalidCredentials?: string;
    loginFailed?: string;
    network?: string;
  };
};

export type LoginFormValues = { email: string; password: string; next?: string };

export type LoginFormProps = PhiSubmitFormProps<LoginFormValues, LoginFormLabels> & {
  descriptor?: PhiFormDescriptor;
  forgotPasswordHref?: string;
  /** Where somebody who has no account goes. Rendered beside the password link, never on its own. */
  registerHref?: string;
  onForgotPassword?: () => void;
  initialValues?: Partial<LoginFormValues>;
};

function waitForNextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export function LoginForm({
  descriptor = PHI_LOGIN_FORM_DESCRIPTOR,
  labels,
  forgotPasswordHref,
  registerHref,
  onForgotPassword,
  initialValues,
  onSubmit,
}: LoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const forgotPasswordLabel = labels?.actions?.forgotPasswordLabel ?? "Forgot password";
  const registerLabel = labels?.actions?.registerLabel ?? "Create account";

  return (
    /*
     * The query container for the rows below the form, which stand beside it rather than in it: a
     * container cannot answer a question about its own width, and the submit and the links have to know
     * where the label column ends to line up under the inputs.
     */
    <div
      style={{
        display: "grid",
        gap: PHI_SPACE.sm,
        containerType: "inline-size",
        containerName: "phi-form",
      }}
    >
      {errorMessage ? <PhiAlertControl level="error" showIcon title={errorMessage} /> : null}
      <PhiFormControl
        ref={formRef}
        descriptor={descriptor}
        labels={flattenPhiFormLabels(labels)}
        initialValues={initialValues}
        onSubmittingChange={setSubmitting}
        onSubmit={async (values) => {
          setErrorMessage(null);
          try {
            await waitForNextPaint();
            await onSubmit(values as LoginFormValues);
          } catch (error) {
            /*
             * A refused login is an answer, not a crash.
             *
             * The message is the whole handling: it belongs in the Alert above the form, where the
             * person who typed the password reads it. Rethrowing it as well left it unhandled --
             * nothing above awaits this submit -- so wrong credentials arrived as an unhandled
             * rejection and Next.js put the dev error overlay over the form that was already saying
             * the same thing.
             */
            setErrorMessage(
              error instanceof Error
                ? error.message
                : labels?.errors?.loginFailed ?? "Login failed.",
            );
          }
        }}
      />
      <div className="phi-form-descriptor-actions">
        <div
          className="phi-form-cell phi-form-cell--control"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: PHI_SPACE.sm }}
        >
          {forgotPasswordHref ? (
            <PhiLink href={forgotPasswordHref}>{forgotPasswordLabel}</PhiLink>
          ) : (
            <PhiLink
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onForgotPassword?.();
              }}
            >
              {forgotPasswordLabel}
            </PhiLink>
          )}
          {registerHref ? (
            <>
              <span aria-hidden style={{ color: PHI_COLOR.textTertiary }}>|</span>
              <PhiLink href={registerHref}>{registerLabel}</PhiLink>
            </>
          ) : null}
        </div>
      </div>
      <div className="phi-form-descriptor-actions">
        <div className="phi-form-cell phi-form-cell--control">
          <PhiButtonControl
            type="primary"
            label={labels?.actions?.submitLabel ?? "Sign in"}
            loading={submitting}
            onClick={() => formRef.current?.submit()}
          />
        </div>
      </div>
    </div>
  );
}
