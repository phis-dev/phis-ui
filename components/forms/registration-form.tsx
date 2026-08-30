"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Space, Typography } from "antd";

import type { PhiFormDescriptor } from "../../types/form-descriptor";
import type { PhiFormGuardProps, PhiSubmitFormProps } from "./contracts";
import { PhiFormControl, type PhiFormControlFormInstance, type PhiFormControlHandle } from "../controls/phi-form-control";
import { flattenPhiFormLabels } from "./form-labels";
import { PHI_REGISTRATION_FORM_DESCRIPTOR } from "./shared-form-descriptors";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiAlertControl } from "../controls/phi-alert-control";
import { PhiButtonControl } from "../controls/phi-button-control";

export type RegistrationFormLabels = {
  fields: {
    firstName: { label: string; placeholder: string; required: string; minLetters: string };
    lastName: { label: string; placeholder: string; required: string; minLetters: string };
    company: { label: string; placeholder: string };
    email: { label: string; placeholder: string; required: string; invalid: string };
    password: { label: string; placeholder: string; required: string; minLength: string };
    confirmPassword: { label: string; placeholder: string; required: string; mismatch: string };
  };
  consent: { terms: ReactNode; termsRequired: string; newsletter: ReactNode };
  actions: { submitLabel: string; pendingLabel: string };
  feedback: {
    successTitle: string;
    successText: string;
    genericError: string;
    accountExistsError: string;
    invalidCredentialsError: string;
    errorTitle: string;
  };
  notice: string;
};

export type RegistrationFormValues = {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  password: string;
  confirmPassword: string;
  website?: string;
  locale?: string;
  issuedAt?: string;
  formToken?: string;
  termsAccepted: boolean;
  newsletter?: boolean;
};

export type RegistrationFormProps = PhiSubmitFormProps<RegistrationFormValues, RegistrationFormLabels> &
  PhiFormGuardProps & {
    locale: string;
    descriptor?: PhiFormDescriptor;
  };

type FormState = { submitted: boolean; error: string };
const REGISTRATION_DRAFT_STORAGE_PREFIX = "phi.registration.draft";

function buildRegistrationDraftStorageKey(locale: string) {
  return `${REGISTRATION_DRAFT_STORAGE_PREFIX}:${locale.trim().toLowerCase() || "default"}`;
}

export function RegistrationForm({
  descriptor = PHI_REGISTRATION_FORM_DESCRIPTOR,
  labels,
  locale,
  issuedAt,
  formToken,
  onSubmit,
}: RegistrationFormProps) {
  const { token } = usePhiConfig();
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const formInstanceRef = useRef<PhiFormControlFormInstance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [state, setState] = useState<FormState>({ submitted: false, error: "" });
  const storageKey = buildRegistrationDraftStorageKey(locale);

  useEffect(() => {
    let cancelled = false;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const values = parsed as Record<string, unknown>;
          queueMicrotask(() => {
            if (cancelled) {
              return;
            }
            setDraftValues(values);
            formInstanceRef.current?.setFieldsValue(values);
          });
        }
      }
    } catch {
      // Draft storage is optional client convenience.
    }
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  return (
    <Space orientation="vertical" size={24} style={{ width: "100%" }}>
      {state.submitted ? (
        <PhiAlertControl level="success" showIcon title={labels.feedback.successTitle} description={labels.feedback.successText} />
      ) : null}
      {state.error ? (
        <PhiAlertControl level="error" showIcon title={labels.feedback.errorTitle} description={state.error} />
      ) : null}
      <PhiFormControl
        ref={formRef}
        descriptor={descriptor}
        labels={flattenPhiFormLabels(labels)}
        initialValues={{ issuedAt, formToken, locale, ...draftValues }}
        onFormReady={(form) => {
          formInstanceRef.current = form;
        }}
        onSubmittingChange={setSubmitting}
        onValuesChange={(_, allValues) => {
          try {
            window.sessionStorage.setItem(storageKey, JSON.stringify(allValues));
          } catch {
            // Draft storage is optional client convenience.
          }
        }}
        onSubmit={async (values) => {
          setState({ submitted: false, error: "" });
          try {
            await onSubmit(values as RegistrationFormValues);
            formRef.current?.reset();
            window.sessionStorage.removeItem(storageKey);
            setState({ submitted: true, error: "" });
          } catch (error) {
            setState({
              submitted: false,
              error: error instanceof Error ? error.message : labels.feedback.genericError,
            });
            throw error;
          }
        }}
      />
      <PhiButtonControl
        type="primary"
        label={submitting ? labels.actions.pendingLabel : labels.actions.submitLabel}
        loading={submitting}
        onClick={() => formRef.current?.submit()}
      />
      <Typography.Paragraph style={{ marginBottom: 0, color: token.colorTextTertiary }}>
        {labels.notice}
      </Typography.Paragraph>
    </Space>
  );
}
