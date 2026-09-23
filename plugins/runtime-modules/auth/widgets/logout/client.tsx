"use client";
import { requestPhiLogout } from "../../../../../helpers/logout";

import { useEffect, useState } from "react";

import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiSpinControl } from "../../../../../components/controls/phi-spin-control";

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
        await requestPhiLogout({ signal: controller.signal, failedMessage: "Logout failed." });
        /* Replaced, not assigned: Back must not return to a sign-out that already happened. */
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
    <PhiFlexControl vertical align="center" gap="middle">
      {error ? (
        <>
          <PhiAlertControl level="error" showIcon title={error} />
          <PhiButtonControl onClick={() => window.location.reload()} label="Try again" />
        </>
      ) : (
        <>
          <PhiSpinControl />
          <PhiTypographyControl type="secondary">Signing out…</PhiTypographyControl>
        </>
      )}
    </PhiFlexControl>
  );
}
