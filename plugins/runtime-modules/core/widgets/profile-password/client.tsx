"use client";

import { useMemo, useRef, useState } from "react";
import { Flex, Typography } from "antd";

import type { PhiClientBlockBaseProps, PhiBlockRuntime } from "../../../../../types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { PhiFormControl, type PhiFormControlHandle } from "../../../../../components/controls/phi-form-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../../../../components/forms/form-provider-contract";
import type { PhiFormDescriptor, PhiFormTextDescriptor } from "../../../../../types/form-descriptor";

const literal = (value: string): PhiFormTextDescriptor => ({ kind: "literal", value });

export type PhiProfilePasswordWidgetLabels = {
  title: string;
  description: string;
  fields: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  submitLabel: string;
  feedback: {
    errorTitle: string;
    errorNetwork: string;
    errorMissingCurrentPassword: string;
    errorMissingNewPassword: string;
    errorInvalidCredentials: string;
    errorPasswordShort: string;
    errorPasswordMismatch: string;
    errorGeneric: string;
    successTitle: string;
    successText: string;
  };
};

type PhiProfilePasswordWidgetFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PhiProfilePasswordWidgetClientProps = PhiClientBlockBaseProps<
  PhiProfilePasswordWidgetLabels,
  {
    padding?: number | string;
  },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

export function PhiProfilePasswordWidgetClient({
  runtime,
  labels,
}: PhiProfilePasswordWidgetClientProps) {
  const { showNotification } = usePhiApplicationFeedback();
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionMaxWidth = 360;
  const descriptor = useMemo<PhiFormDescriptor>(() => ({ schemaVersion: 1, key: "profile-password", layout: { columns: { compact: 1, medium: 1, wide: 1 }, labelPlacement: "top", gap: { compact: "sm", medium: "sm", wide: "sm" } }, fields: [
    { key: "currentPassword", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password, label: literal(labels.fields.currentPassword), autoComplete: "current-password", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.feedback.errorMissingCurrentPassword) }] },
    { key: "newPassword", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password, label: literal(labels.fields.newPassword), autoComplete: "new-password", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.feedback.errorMissingNewPassword) }, { providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLength, message: literal(labels.feedback.errorPasswordShort), config: { min: 10 } }] },
    { key: "confirmPassword", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password, label: literal(labels.fields.confirmPassword), autoComplete: "new-password", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.feedback.errorMissingNewPassword) }, { providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField, message: literal(labels.feedback.errorPasswordMismatch), config: { field: "newPassword" } }] },
  ] }), [labels]);

  async function handleSubmit(values: PhiProfilePasswordWidgetFormValues) {
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

      const response = await fetch("/api/auth/profile/password", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        const responseError = payload?.error?.trim() ?? "";
        if (responseError === "Missing current password.") {
          throw new Error(labels.feedback.errorMissingCurrentPassword);
        }
        if (responseError === "Missing new password fields.") {
          throw new Error(labels.feedback.errorMissingNewPassword);
        }
        if (responseError === "Invalid credentials.") {
          throw new Error(labels.feedback.errorInvalidCredentials);
        }
        if (responseError === "Password is too short.") {
          throw new Error(labels.feedback.errorPasswordShort);
        }
        if (responseError === "Passwords do not match.") {
          throw new Error(labels.feedback.errorPasswordMismatch);
        }

        throw new Error(responseError || labels.feedback.errorGeneric);
      }

      setSaving(false);
      showNotification({
        level: "success",
        title: labels.feedback.successTitle,
        description: labels.feedback.successText,
        placement: "bottomRight",
        durationSeconds: 2,
      });
      window.setTimeout(() => {
        window.location.assign(`/${runtime?.locale.current ?? "en"}/login?login=1`);
      }, 900);
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

        <PhiFormControl
          ref={formRef}
          descriptor={descriptor}
          initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }}
          onSubmit={(values) => handleSubmit(values as PhiProfilePasswordWidgetFormValues)}
        />
        <PhiButtonControl type="primary" loading={saving} label={labels.submitLabel} onClick={() => formRef.current?.submit()} />
      </Flex>
  );
}
