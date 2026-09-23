"use client";

import { useState } from "react";

import { PhiTextControl } from "../../controls/phi-text-control";
import { PhiOtpControl } from "../../controls/phi-otp-control";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiFlexControl } from "../../controls/phi-flex-control";
import { PhiTypographyControl } from "../../controls/phi-typography-control";
import { PhiQrCodeControl } from "../../controls/phi-qr-code-control";
import { fetchPhiCsrfToken } from "../../../helpers/csrf-token";

type Enrollment = {
  factorId: string;
  manualKey: string;
  otpauthUri: string;
};

/**
 * Which of the two things this is, which is not the same question as what state a Session is in.
 *
 * It used to take a `PhiAuthWorkflow`, and the App settings surface had to invent one to add an
 * authenticator -- a value describing an authentication in progress, written by a browser for somebody
 * who had finished signing in an hour ago. That was never a state Core could have answered for: adding
 * a device voluntarily is not a step in signing in, and `GET /api/v1/auth/workflow` answers `complete`
 * for exactly those people.
 *
 * So this asks for what it actually uses. Of the workflow it only ever read `state` and `next`, and
 * never `methodKey` at all.
 */
export type PhiAuthWorkflowBodyMode = "enroll" | "challenge";

export function PhiAuthWorkflowBody({
  mode,
  next: fallbackNext,
  onComplete,
}: {
  mode: PhiAuthWorkflowBodyMode;
  /** Where a finished step goes when the server's answer does not name somewhere itself. */
  next: string;
  onComplete: (payload: { area: string | null; next: string }) => Promise<void> | void;
}) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [methodKey, setMethodKey] = useState<"totp" | "recovery-code">("totp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<{
    codes: string[];
    area: string | null;
    next: string;
  } | null>(null);

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    try {
      const token = await fetchPhiCsrfToken();
      const response = await fetch("/api/auth/workflow/totp/enroll", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json", "x-csrf-token": token },
      });
      const payload = await response.json().catch(() => null) as (Enrollment & { error?: string }) | null;
      if (!response.ok || !payload?.factorId || !payload.otpauthUri) {
        throw new Error(payload?.error ?? "Authenticator setup could not be started.");
      }
      setEnrollment(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authenticator setup could not be started.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const token = await fetchPhiCsrfToken();
      const enrolling = mode === "enroll";
      const response = await fetch(
        enrolling ? "/api/auth/workflow/totp/confirm" : "/api/auth/workflow/verify",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "x-csrf-token": token,
          },
          body: JSON.stringify(enrolling
            ? { factorId: enrollment?.factorId, code }
            : { methodKey, code }),
        },
      );
      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        area?: string;
        next?: string;
        recoveryCodes?: string[];
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Authentication code could not be verified.");
      }
      if (Array.isArray(payload.recoveryCodes) && payload.recoveryCodes.length > 0) {
        setRecovery({
          codes: payload.recoveryCodes,
          area: payload.area?.trim() || null,
          next: payload.next ?? fallbackNext,
        });
        return;
      }
      await onComplete({ area: payload.area?.trim() || null, next: payload.next ?? fallbackNext });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  if (recovery) {
    return (
      <PhiFlexControl vertical gap="middle">
        <PhiAlertControl
          level="success"
          showIcon
          title="Authenticator configured"
          description="Save these recovery codes now. They are shown only once."
        />
        <PhiFlexControl vertical gap="small">
          {recovery.codes.map((recoveryCode) => (
            <PhiTypographyControl key={recoveryCode} copyable code>{recoveryCode}</PhiTypographyControl>
          ))}
        </PhiFlexControl>
        <PhiButtonControl
          type="primary"
          onClick={() => void onComplete({ area: recovery.area, next: recovery.next })}
          label="I saved the recovery codes"
        />
      </PhiFlexControl>
    );
  }

  if (mode === "enroll") {
    return (
      <PhiFlexControl vertical gap="middle" align="center">
        <PhiTypographyControl presentation="title" level={4}>Set up an authenticator app</PhiTypographyControl>
        {/*
          * Says what to do, not why it is being asked -- because both callers land here: a sign-in that
          * cannot continue without it, and somebody in Settings adding a device because they want one.
          * It told the second group their site could not be opened. The wording belongs in a Label Set
          * like every other sentence a visitor reads; it is literal here because it always was.
          */}
        <PhiTypographyControl presentation="paragraph" type="secondary">
          Scan the code below with your authenticator app, then enter the six-digit code it shows.
        </PhiTypographyControl>
        {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
        {!enrollment ? (
          <PhiButtonControl type="primary" loading={busy} onClick={() => void startEnrollment()} label="Start setup" />
        ) : (
          <>
            <PhiQrCodeControl value={enrollment.otpauthUri} type="svg" />
            <PhiTypographyControl copyable code>{enrollment.manualKey}</PhiTypographyControl>
            <PhiOtpControl
              ariaLabel="Authenticator code"
              length={6}
              value={code}
              onChange={setCode}
              disabled={busy}
            />
            <PhiButtonControl
              type="primary"
              loading={busy}
              disabled={!/^\d{6}$/.test(code)}
              onClick={() => void submit()}
              label="Verify and continue"
            />
          </>
        )}
      </PhiFlexControl>
    );
  }

  return (
    <PhiFlexControl vertical gap="middle">
      <PhiTypographyControl presentation="title" level={4}>Two-factor authentication</PhiTypographyControl>
      {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
      <PhiTextControl
        value={code}
        inputType={methodKey === "totp" ? "digits" : "text"}
        autoComplete="one-time-code"
        maxLength={methodKey === "totp" ? 6 : 11}
        placeholder={methodKey === "totp" ? "6-digit code" : "Recovery code"}
        allowClear={false}
        onChange={(nextValue) => setCode(nextValue ?? "")}
        disabled={busy}
      />
      <PhiButtonControl type="primary" loading={busy} onClick={() => void submit()} label="Verify and continue" />
      <PhiButtonControl
        type="link"
        onClick={() => {
          setMethodKey((current) => current === "totp" ? "recovery-code" : "totp");
          setCode("");
        }}
        label={methodKey === "totp" ? "Use a recovery code" : "Use authenticator code"}
      />
    </PhiFlexControl>
  );
}
