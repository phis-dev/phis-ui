"use client";
import { requestPhiLogout } from "../../../../../helpers/logout";

import { useEffect, useState } from "react";

import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import type { PhiAuthLogoutWidgetLabels } from "../../../../../components/widgets/label-types/logout";
import { localizePath } from "../../../../../helpers/locale";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiSpinControl } from "../../../../../components/controls/phi-spin-control";

export function PhiAuthLogoutWidgetClient({
  runtime,
  labels,
}: PhiClientBlockBaseProps<
  PhiAuthLogoutWidgetLabels,
  { padding?: number | string },
  Pick<PhiBlockRuntime, "site" | "locale">
> & {
  // Always handed over with the request's locale, so the page after sign-out is never a guessed one.
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
  labels: PhiAuthLogoutWidgetLabels;
}) {
  const [error, setError] = useState<string | null>(null);
  const locale = runtime.locale.current;
  const siteKey = runtime.site.key;
  const failedLabel = labels.failed;

  useEffect(() => {
    const controller = new AbortController();
    async function logout() {
      try {
        await requestPhiLogout({ signal: controller.signal, failedMessage: failedLabel });
        /*
         * Replaced, not assigned: Back must not return to a sign-out that already happened. The start
         * page in this locale, built the way every other address is rather than by hand.
         */
        window.location.replace(localizePath(locale, "/"));
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : failedLabel);
        }
      }
    }
    void logout();
    return () => controller.abort();
  }, [failedLabel, locale, siteKey]);

  return (
    <PhiFlexControl vertical align="center" gap="middle">
      {error ? (
        <>
          <PhiAlertControl level="error" showIcon title={error} />
          <PhiButtonControl onClick={() => window.location.reload()} label={labels.retry} />
        </>
      ) : (
        <>
          <PhiSpinControl />
          <PhiTypographyControl type="secondary">{labels.signingOut}</PhiTypographyControl>
        </>
      )}
    </PhiFlexControl>
  );
}
