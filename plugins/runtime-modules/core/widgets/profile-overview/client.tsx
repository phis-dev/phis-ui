"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flex, Typography } from "antd";

import type { PhiClientBlockBaseProps, PhiBlockRuntime } from "../../../../../types";
import { PhiSwitchControl } from "../../../../../components/controls/phi-switch-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";

export type PhiProfileOverviewWidgetLabels = {
  title: string;
  description: string;
  accountLabel: string;
  newsletterLabel: string;
  newsletterDescription: string;
  newsletterOn: string;
  newsletterOff: string;
  feedback: {
    errorTitle: string;
    errorNetwork: string;
    errorGeneric: string;
    successTitle: string;
    successText: string;
  };
};

export type PhiProfileOverviewWidgetClientProps = PhiClientBlockBaseProps<
  PhiProfileOverviewWidgetLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

function buildDisplayName(profile?: {
  firstName?: string | null;
  lastName?: string | null;
} | null, email?: string | null) {
  const fullName = [profile?.firstName?.trim() ?? "", profile?.lastName?.trim() ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || email || "—";
}

export function PhiProfileOverviewWidgetClient({
  runtime,
  labels,
}: PhiProfileOverviewWidgetClientProps) {
  const router = useRouter();
  const { showNotification } = usePhiApplicationFeedback();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = runtime?.viewer.profile ?? null;
  const email = runtime?.viewer.userEmail ?? null;
  const newsletterOptIn = Boolean(runtime?.viewer.newsletterOptIn);
  const currentTitle = buildDisplayName(profile, email);
  const sectionMaxWidth = 360;

  async function handleNewsletterChange(nextChecked: boolean) {
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

      const response = await fetch("/api/auth/profile/newsletter", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ newsletterOptIn: nextChecked }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; newsletterOptIn?: boolean; error?: string }
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
      <Flex vertical gap={12} style={{ width: "100%", maxWidth: sectionMaxWidth }}>
        <Flex vertical gap={4}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {labels.title}
          </Typography.Title>
          <Typography.Text type="secondary">{labels.description}</Typography.Text>
        </Flex>

        {error ? (
          <PhiAlertControl level="error" showIcon title={labels.feedback.errorTitle} description={error} />
        ) : null}

        <Flex vertical gap={4}>
          <Typography.Text type="secondary">
            {labels.accountLabel}: {currentTitle}
          </Typography.Text>
        </Flex>

        <Flex align="center" gap={12} wrap>
          <PhiSwitchControl checked={newsletterOptIn} loading={saving} onChange={(checked) => void handleNewsletterChange(checked)} />
          <Flex vertical gap={2}>
            <Typography.Text strong>{labels.newsletterLabel}</Typography.Text>
            <Typography.Text type="secondary">{labels.newsletterDescription}</Typography.Text>
          </Flex>
        </Flex>
      </Flex>
  );
}
