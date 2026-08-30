"use client";

import { useRouter } from "next/navigation";
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

export type PhiProfileNameWidgetLabels = {
  title: string;
  description: string;
  fields: {
    firstName: string;
    lastName: string;
    companyName: string;
  };
  currentLabel: string;
  submitLabel: string;
  feedback: {
    errorTitle: string;
    errorNetwork: string;
    errorGeneric: string;
    successTitle: string;
    successText: string;
  };
};

type PhiProfileNameWidgetFormValues = {
  firstName: string;
  lastName: string;
  companyName?: string;
};

export type PhiProfileNameWidgetClientProps = PhiClientBlockBaseProps<
  PhiProfileNameWidgetLabels,
  {
    padding?: number | string;
  },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

function buildCurrentNameText(profile?: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
} | null) {
  const fullName = [profile?.firstName?.trim() ?? "", profile?.lastName?.trim() ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const company = profile?.companyName?.trim() ?? "";

  if (fullName && company) {
    return `${fullName} · ${company}`;
  }

  return fullName || company || "—";
}

export function PhiProfileNameWidgetClient({
  runtime,
  labels,
}: PhiProfileNameWidgetClientProps) {
  const router = useRouter();
  const { showNotification } = usePhiApplicationFeedback();
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionMaxWidth = 360;

  const profile = runtime?.viewer.profile ?? null;
  const descriptor = useMemo<PhiFormDescriptor>(() => ({
    schemaVersion: 1,
    key: "profile-name",
    layout: { columns: { compact: 1, medium: 1, wide: 1 }, labelPlacement: "top", gap: { compact: "sm", medium: "sm", wide: "sm" } },
    fields: [
      { key: "firstName", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: literal(labels.fields.firstName), autoComplete: "given-name", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.fields.firstName) }] },
      { key: "lastName", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: literal(labels.fields.lastName), autoComplete: "family-name", validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.fields.lastName) }] },
      { key: "companyName", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: literal(labels.fields.companyName), autoComplete: "organization" },
    ],
  }), [labels.fields]);

  async function handleSubmit(values: PhiProfileNameWidgetFormValues) {
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

      const response = await fetch("/api/auth/profile/name", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          companyName: values.companyName,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.trim() || labels.feedback.errorGeneric);
      }

      setSaving(false);
      showNotification({
        level: "success",
        title: labels.feedback.successTitle,
        description: labels.feedback.successText,
        placement: "bottomRight",
        durationSeconds: 2,
      });
      router.refresh();
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
          {labels.currentLabel}: {buildCurrentNameText(profile)}
        </Typography.Text>

        <PhiFormControl
          ref={formRef}
          descriptor={descriptor}
          initialValues={{
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            companyName: profile?.companyName ?? "",
          }}
          onSubmit={(values) => handleSubmit(values as PhiProfileNameWidgetFormValues)}
        />
        <PhiButtonControl type="primary" loading={saving} label={labels.submitLabel} onClick={() => formRef.current?.submit()} />
      </Flex>
  );
}
