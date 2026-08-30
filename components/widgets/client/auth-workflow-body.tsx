"use client";

import { useState } from "react";
import { Button, Flex, Input, QRCode, Typography } from "antd";
import { PhiAlertControl } from "../../controls/phi-alert-control";

export type PhiAuthWorkflow = {
  state: "factor-enrollment-required" | "factor-challenge-required" | "complete";
  methodKey: "totp" | null;
  next: string;
};

type Enrollment = {
  factorId: string;
  manualKey: string;
  otpauthUri: string;
};

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof payload?.token === "string" ? payload.token : "";
  if (!response.ok || !token) throw new Error("Could not initialize authentication session.");
  return token;
}

export function PhiAuthWorkflowBody({
  workflow,
  onComplete,
}: {
  workflow: PhiAuthWorkflow;
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
      const token = await getCsrfToken();
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
      const token = await getCsrfToken();
      const enrolling = workflow.state === "factor-enrollment-required";
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
          next: payload.next ?? workflow.next,
        });
        return;
      }
      await onComplete({ area: payload.area?.trim() || null, next: payload.next ?? workflow.next });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  if (recovery) {
    return (
      <Flex vertical gap="middle">
        <PhiAlertControl
          level="success"
          showIcon
          title="Authenticator configured"
          description="Save these recovery codes now. They are shown only once."
        />
        <Flex vertical gap="small">
          {recovery.codes.map((recoveryCode) => (
            <Typography.Text key={recoveryCode} copyable code>{recoveryCode}</Typography.Text>
          ))}
        </Flex>
        <Button
          type="primary"
          onClick={() => void onComplete({ area: recovery.area, next: recovery.next })}
        >
          I saved the recovery codes
        </Button>
      </Flex>
    );
  }

  if (workflow.state === "factor-enrollment-required") {
    return (
      <Flex vertical gap="middle" align="center">
        <Typography.Title level={4}>Set up an authenticator app</Typography.Title>
        <Typography.Paragraph type="secondary">
          Two-factor authentication is required before this site can be opened.
        </Typography.Paragraph>
        {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
        {!enrollment ? (
          <Button type="primary" loading={busy} onClick={() => void startEnrollment()}>
            Start setup
          </Button>
        ) : (
          <>
            <QRCode value={enrollment.otpauthUri} type="svg" />
            <Typography.Text copyable code>{enrollment.manualKey}</Typography.Text>
            <Input.OTP length={6} value={code} onChange={setCode} disabled={busy} />
            <Button
              type="primary"
              loading={busy}
              disabled={!/^\d{6}$/.test(code)}
              onClick={() => void submit()}
            >
              Verify and continue
            </Button>
          </>
        )}
      </Flex>
    );
  }

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={4}>Two-factor authentication</Typography.Title>
      {error ? <PhiAlertControl level="error" showIcon title={error} /> : null}
      <Input
        value={code}
        inputMode={methodKey === "totp" ? "numeric" : "text"}
        autoComplete="one-time-code"
        maxLength={methodKey === "totp" ? 6 : 11}
        placeholder={methodKey === "totp" ? "6-digit code" : "Recovery code"}
        onChange={(event) => setCode(event.target.value)}
        disabled={busy}
      />
      <Button type="primary" loading={busy} onClick={() => void submit()}>
        Verify and continue
      </Button>
      <Button
        type="link"
        onClick={() => {
          setMethodKey((current) => current === "totp" ? "recovery-code" : "totp");
          setCode("");
        }}
      >
        {methodKey === "totp" ? "Use a recovery code" : "Use authenticator code"}
      </Button>
    </Flex>
  );
}
