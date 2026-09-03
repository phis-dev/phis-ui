"use client";

import { useEffect, useState } from "react";
import { Button, Flex, Spin, Typography } from "antd";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PHIS_SITE_KEY_HEADER } from "../../../../../constants/http-headers";

export function PhiAuthLogoutWidgetClient({
  runtime,
}: PhiClientBlockBaseProps<
  Record<string, never>,
  { padding?: number | string },
  Pick<PhiBlockRuntime, "site" | "locale">
>) {
  const [error, setError] = useState<string | null>(null);
  const locale = runtime?.locale.current ?? "en";
  const siteKey = runtime?.site.key ?? "";

  useEffect(() => {
    const controller = new AbortController();
    async function logout() {
      try {
        const csrfResponse = await fetch("/api/auth/csrf", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const csrfPayload = await csrfResponse.json().catch(() => null) as { token?: unknown } | null;
        const token = typeof csrfPayload?.token === "string" ? csrfPayload.token : "";
        if (!csrfResponse.ok || !token) throw new Error("Logout could not be initialized.");

        const headers = new Headers({ "x-csrf-token": token });
        if (siteKey) headers.set(PHIS_SITE_KEY_HEADER, siteKey);
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Logout failed.");
        window.location.replace(`/${locale}`);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Logout failed.");
        }
      }
    }
    void logout();
    return () => controller.abort();
  }, [locale, siteKey]);

  return (
    <Flex vertical align="center" gap="middle">
      {error ? (
        <>
          <PhiAlertControl level="error" showIcon title={error} />
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </>
      ) : (
        <>
          <Spin />
          <Typography.Text type="secondary">Signing out…</Typography.Text>
        </>
      )}
    </Flex>
  );
}
