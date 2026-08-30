"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Flex, Typography } from "antd";

import { stripLocaleFromPathname } from "../../../../../helpers/locale";
import type { PhiClientBlockBaseProps, PhiBlockRuntime } from "../../../../../types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { PhiFormControl, type PhiFormControlHandle } from "../../../../../components/controls/phi-form-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../../../../components/forms/form-provider-contract";
import type { PhiFormDescriptor, PhiFormTextDescriptor } from "../../../../../types/form-descriptor";

const literal = (value: string): PhiFormTextDescriptor => ({ kind: "literal", value });

export type PhiProfileLocaleWidgetLabels = {
  title: string;
  description: string;
  fieldLabel: string;
  currentLabel: string;
  submitLabel: string;
  feedback: {
    errorTitle: string;
    errorNetwork: string;
    errorInvalidLocale: string;
    errorGeneric: string;
    successTitle: string;
    successText: string;
  };
};

type PhiProfileLocaleWidgetFormValues = {
  locale: string;
};

export type PhiProfileLocaleWidgetClientProps = PhiClientBlockBaseProps<
  PhiProfileLocaleWidgetLabels,
  {
    padding?: number | string;
  },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

function normalizeLocaleCode(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

function resolveInitialLocale(
  preferredLocale: string | null | undefined,
  availableLocales: Array<{ code: string; label: string }>,
  fallbackLocale: string,
) {
  const normalizedPreferred = normalizeLocaleCode(preferredLocale ?? "");
  const preferredMatch = availableLocales.find(
    (option) => normalizeLocaleCode(option.code) === normalizedPreferred,
  );
  if (preferredMatch) {
    return preferredMatch.code;
  }

  const normalizedFallback = normalizeLocaleCode(fallbackLocale);
  const fallbackMatch = availableLocales.find(
    (option) => normalizeLocaleCode(option.code) === normalizedFallback,
  );
  if (fallbackMatch) {
    return fallbackMatch.code;
  }

  return availableLocales[0]?.code ?? fallbackLocale;
}

export function PhiProfileLocaleWidgetClient({
  runtime,
  labels,
}: PhiProfileLocaleWidgetClientProps) {
  const { showNotification } = usePhiApplicationFeedback();
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionMaxWidth = 360;

  const availableLocales = useMemo(
    () => runtime?.site.availableLocales ?? [],
    [runtime?.site.availableLocales],
  );

  const currentLocale =
    resolveInitialLocale(
      runtime?.viewer.preferredLocale,
      availableLocales,
      runtime?.locale.current ?? availableLocales[0]?.code ?? "en",
    ) ?? availableLocales[0]?.code ?? "en";
  const descriptor = useMemo<PhiFormDescriptor>(() => ({ schemaVersion: 1, key: "profile-locale", layout: { columns: { compact: 1, medium: 1, wide: 1 }, labelPlacement: "top", gap: { compact: "sm", medium: "sm", wide: "sm" } }, fields: [{
    key: "locale",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
    label: literal(labels.fieldLabel),
    options: availableLocales.map((option) => ({ value: option.code, label: literal(option.label) })),
    validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal(labels.feedback.errorInvalidLocale) }],
  }] }), [availableLocales, labels.feedback.errorInvalidLocale, labels.fieldLabel]);

  if (availableLocales.length === 0) {
    return null;
  }

  async function handleSubmit(values: PhiProfileLocaleWidgetFormValues) {
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

      const response = await fetch("/api/auth/profile/locale", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          locale: values.locale,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; preferredLocale?: string; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        const responseError = payload?.error?.trim();
        if (responseError === "Unsupported locale.") {
          throw new Error(labels.feedback.errorInvalidLocale);
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
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const targetPath = stripLocaleFromPathname(pathname, {
        availableLocales: availableLocales.map((locale) => locale.code),
      });
      const query = searchParams?.toString();
      window.location.assign(`${targetPath}${query ? `?${query}` : ""}`);
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
          <PhiAlertControl
            level="error"
            showIcon
            title={labels.feedback.errorTitle}
            description={error}
          />
        ) : null}

        <PhiFormControl
          ref={formRef}
          descriptor={descriptor}
          initialValues={{ locale: currentLocale }}
          onSubmit={(values) => handleSubmit(values as PhiProfileLocaleWidgetFormValues)}
        />
        <PhiButtonControl type="primary" loading={saving} label={labels.submitLabel} onClick={() => formRef.current?.submit()} />
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            {labels.currentLabel}:{" "}
            {
              availableLocales.find(
                (option) => normalizeLocaleCode(option.code) === normalizeLocaleCode(currentLocale),
              )?.label ?? currentLocale
            }
          </Typography.Text>
      </Flex>
  );
}
