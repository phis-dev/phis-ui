"use client";

import { useRef, useState } from "react";
import { PhiAlertControl } from "../controls/phi-alert-control";

import type { PhiFormDescriptor } from "../../types/form-descriptor";
import { PhiLink } from "../navigation/phi-link";
import type { PhiSubmitFormProps } from "./contracts";
import { PhiFormControl, type PhiFormControlHandle } from "../controls/phi-form-control";
import { PhiButtonControl } from "../controls/phi-button-control";
import { flattenPhiFormLabels } from "./form-labels";
import { PHI_LOGIN_FORM_DESCRIPTOR } from "./shared-form-descriptors";

export type LoginFormLabels = {
  title?: string;
  actions?: { submitLabel?: string; forgotPasswordLabel?: string };
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
  onForgotPassword,
  initialValues,
  onSubmit,
}: LoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const forgotPasswordLabel = labels?.actions?.forgotPasswordLabel ?? "Forgot password?";

  return (
    <div style={{ display: "grid", gap: "var(--ant-padding-sm)" }}>
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
            setErrorMessage(
              error instanceof Error
                ? error.message
                : labels?.errors?.loginFailed ?? "Login failed.",
            );
            throw error;
          }
        }}
      />
      <PhiButtonControl
        type="primary"
        label={labels?.actions?.submitLabel ?? "Login"}
        loading={submitting}
        onClick={() => formRef.current?.submit()}
      />
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
    </div>
  );
}
