"use client";

import { useMemo, useRef, useState } from "react";
import { Flex, Typography } from "antd";

import type { PhiClientBlockBaseProps, PhiBlockRuntime } from "../../../../../types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { PhiFormControl, type PhiFormControlFormInstance, type PhiFormControlHandle } from "../../../../../components/controls/phi-form-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../../../../components/forms/form-provider-contract";
import type { PhiFormDescriptor, PhiFormTextDescriptor } from "../../../../../types/form-descriptor";

const literal = (value: string): PhiFormTextDescriptor => ({ kind: "literal", value });

export type PhiProfileEmailWidgetLabels = {
  title: string;
  description: string;
  currentLabel: string;
  fields: {
    email: string;
    password: string;
  };
  submitLabel: string;
  feedback: {
    errorTitle: string;
    errorNetwork: string;
    errorInvalidEmail: string;
    errorMissingPassword: string;
    errorInvalidCredentials: string;
    errorConflict: string;
    errorGeneric: string;
    successTitle: string;
    successText: string;
    successUnchangedTitle: string;
    successUnchangedText: string;
  };
};

type PhiProfileEmailWidgetFormValues = {
  email: string;
  currentPassword: string;
};

export type PhiProfileEmailWidgetClientProps = PhiClientBlockBaseProps<
  PhiProfileEmailWidgetLabels,
  {
    padding?: number | string;
  },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

export function PhiProfileEmailWidgetClient({
  runtime,
  labels,
}: PhiProfileEmailWidgetClientProps) {
  const { showNotification } = usePhiApplicationFeedback();
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const formInstanceRef = useRef<PhiFormControlFormInstance | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionMaxWidth = 360;

  const currentEmail = runtime?.viewer.userEmail?.trim() ?? "";
  const descriptor = useMemo<PhiFormDescriptor>(() => ({ schemaVersion: 1, key: "profile-email", layout: { columns: { compact: 1, medium: 1, wide: 1 }, labelPlacement: "top", gap: { compact: "sm", medium: "sm", wide: "sm" } }, fields: [
    { key: "email", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email, label: literal(labels.fields.email), autoComplete: "email", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.feedback.errorInvalidEmail) }, { providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email, message: literal(labels.feedback.errorInvalidEmail) }] },
    { key: "currentPassword", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password, label: literal(labels.fields.password), autoComplete: "current-password", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.feedback.errorMissingPassword) }] },
  ] }), [labels]);

  async function handleSubmit(values: PhiProfileEmailWidgetFormValues) {
    setSaving(true);
    setError(null);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const csrfPayload = (await csrfResponse.json().catch(() => ({}))) as { token?: string };
      const csrfToken = csrfPayload.token?.trim() ?? "";
      if (!csrfResponse.ok || !csrfToken) {
        throw new Error(labels.feedback.errorNetwork);
      }

      const response = await fetch("/api/auth/profile/email/request", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          email: values.email,
          currentPassword: values.currentPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; status?: string; email?: string; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        const responseError = payload?.error?.trim() ?? "";
        if (responseError === "Invalid email address.") {
          throw new Error(labels.feedback.errorInvalidEmail);
        }
        if (responseError === "Missing current password.") {
          throw new Error(labels.feedback.errorMissingPassword);
        }
        if (responseError === "Invalid credentials.") {
          throw new Error(labels.feedback.errorInvalidCredentials);
        }
        if (responseError === "This email address is already in use.") {
          throw new Error(labels.feedback.errorConflict);
        }

        throw new Error(responseError || labels.feedback.errorGeneric);
      }

      setSaving(false);
      formInstanceRef.current?.setFieldsValue({ currentPassword: "" });
      if (payload.status === "unchanged") {
        showNotification({
          level: "info",
          title: labels.feedback.successUnchangedTitle,
          description: labels.feedback.successUnchangedText,
          placement: "bottomRight",
          durationSeconds: 2,
        });
        return;
      }

      showNotification({
        level: "success",
        title: labels.feedback.successTitle,
        description: labels.feedback.successText,
        placement: "bottomRight",
        durationSeconds: 2,
      });
      return;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.feedback.errorGeneric);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flex vertical gap={16} style={{ width: "100%", maxWidth: sectionMaxWidth }}>
        <Flex vertical gap={4}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {labels.title}
          </Typography.Title>
          <Typography.Text type="secondary">{labels.description}</Typography.Text>
        </Flex>

        {error ? (
          <PhiAlertControl level="error" showIcon title={labels.feedback.errorTitle} description={error} />
        ) : null}

        <Typography.Text type="secondary">
          {labels.currentLabel}: {currentEmail || "—"}
        </Typography.Text>

        <PhiFormControl
          ref={formRef}
          descriptor={descriptor}
          initialValues={{ email: "", currentPassword: "" }}
          onFormReady={(form) => { formInstanceRef.current = form; }}
          onSubmit={(values) => handleSubmit(values as PhiProfileEmailWidgetFormValues)}
        />
        <PhiButtonControl type="primary" loading={saving} label={labels.submitLabel} onClick={() => formRef.current?.submit()} />
      </Flex>
  );
}
