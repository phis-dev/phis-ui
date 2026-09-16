"use client";

import { useState } from "react";
import { Divider } from "antd";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiRuntimePageConditionState } from "../../../../../components/runtime/runtime-page-condition-state";
import { normalizeLoginRedirectTarget } from "../../../../../components/widgets/login-redirect";
import type { PhiPublicAuthManifest } from "../../../../../types/auth-manifest";

export type PhiAuthMethodsWidgetClientProps = {
  methods: PhiPublicAuthManifest["methods"];
  /** Whether a password form stands above this, which is the only reason to draw a separator. */
  withSeparator: boolean;
  labels: {
    separator: string;
    failed: string;
    unavailable: string;
  };
};

async function getCsrfToken(unavailable: string) {
  const response = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof payload?.token === "string" ? payload.token : "";
  if (!response.ok || !token) throw new Error(unavailable);
  return token;
}

export function PhiAuthMethodsWidgetClient({
  methods,
  withSeparator,
  labels,
}: PhiAuthMethodsWidgetClientProps) {
  const page = usePhiRuntimePageConditionState();
  const [startingMethod, setStartingMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startMethod(method: PhiPublicAuthManifest["methods"][number]) {
    setStartingMethod(method.methodKey);
    setError(null);
    try {
      const csrfToken = await getCsrfToken(labels.unavailable);
      const next = normalizeLoginRedirectTarget(page.query.next) ?? page.path;
      const response = await fetch(method.startPath, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ next }),
      });
      const payload = await response.json().catch(() => null) as {
        redirectUrl?: unknown;
        error?: unknown;
      } | null;
      if (!response.ok || typeof payload?.redirectUrl !== "string") {
        throw new Error(typeof payload?.error === "string" ? payload.error : labels.failed);
      }
      /*
       * The one forward that does not go through the Runtime Controller, and the reason is the point of
       * that Controller: it refuses anything that is not a path on this Site, and this deliberately
       * leaves the Site. The address was minted by our own auth backend one line ago in answer to this
       * request -- it is not a value a page carried in, which is the case the refusal exists for.
       */
      window.location.assign(payload.redirectUrl);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : labels.failed);
      setStartingMethod(null);
    }
  }

  if (methods.length === 0) {
    return null;
  }

  return (
    <>
      {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
      {withSeparator ? <Divider plain>{labels.separator}</Divider> : null}
      {methods.map((method) => (
        <PhiButtonControl
          key={method.methodKey}
          block
          loading={startingMethod === method.methodKey}
          disabled={startingMethod !== null && startingMethod !== method.methodKey}
          onClick={() => void startMethod(method)}
          label={method.label}
        />
      ))}
    </>
  );
}
