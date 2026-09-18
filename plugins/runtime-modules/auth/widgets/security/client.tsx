"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Card, List } from "antd";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiConfirmControl } from "../../../../../components/controls/phi-confirm-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiSkeletonControl } from "../../../../../components/controls/phi-skeleton-control";

const PhiAuthWorkflowBody = lazy(
  () => import("../../../../../components/widgets/client/auth-workflow-body")
    .then((module) => ({ default: module.PhiAuthWorkflowBody })),
);

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const payload = await response.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof payload?.token === "string" ? payload.token : "";
  if (!response.ok || !token) throw new Error("Could not initialize authentication session.");
  return token;
}

type SecurityPayload = {
  ok: boolean;
  policy: { factor: { requiredMethod?: "totp" | null } | null };
  factors: Array<{
    id: string;
    type: number;
    label: string | null;
    confirmedAt: string | null;
    createdAt: string | null;
    lastUsedAt: string | null;
  }>;
  identities: Array<{
    id: number;
    providerKey: string;
    issuer: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  sessions: Array<{
    id: string;
    createdAt: string | null;
    lastSeenAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
  currentSessionId: string;
};

export function PhiAuthSecurityWidgetClient({ apiPath = "/api/auth/account/security" }: { apiPath?: string }) {
  const [payload, setPayload] = useState<SecurityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(apiPath, {
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      });
      const next = await response.json().catch(() => null) as SecurityPayload | null;
      if (!response.ok || !next?.ok) throw new Error("Account security could not be loaded.");
      setPayload(next);
      setError(null);
    } catch (caught) {
      if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Account security could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void load(controller.signal));
    return () => controller.abort();
  }, [load]);

  async function removeFactor(factorId: string) {
    try {
      const token = await getCsrfToken();
      const response = await fetch(`/api/auth/account/factors/${encodeURIComponent(factorId)}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json", "x-csrf-token": token },
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Authentication factor could not be removed.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication factor could not be removed.");
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      const token = await getCsrfToken();
      const response = await fetch(`/api/auth/account/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json", "x-csrf-token": token },
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Session could not be revoked.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Session could not be revoked.");
    }
  }

  if (enrolling) {
    return (
      <Suspense fallback={<PhiSkeletonControl lines={4} />}>
        <PhiAuthWorkflowBody
          workflow={{ state: "factor-enrollment-required", methodKey: "totp", next: "/app/security" }}
          onComplete={async () => {
            setEnrolling(false);
            await load();
          }}
        />
      </Suspense>
    );
  }
  if (loading) return <PhiSkeletonControl lines={8} withTitle />;
  if (!payload) return <PhiAlertControl level="error" showIcon title={error ?? "Account security is unavailable."} />;

  return (
    <PhiFlexControl vertical gap="large">
      {/* No heading: the Settings panel this stands in is titled with what it is. */}
      <PhiTypographyControl presentation="paragraph" type="secondary">
        Manage authenticator apps, linked login providers, and sessions for this site.
      </PhiTypographyControl>
      {error ? <PhiAlertControl level="error" showIcon title={error} dismissible onDismiss={() => setError(null)} /> : null}
      <Card
        title="Authenticator apps"
        extra={<PhiButtonControl type="primary" onClick={() => setEnrolling(true)} label="Add authenticator" />}
      >
        <List
          locale={{ emptyText: "No authenticator configured." }}
          dataSource={payload.factors.filter((factor) => factor.type === 2 && factor.confirmedAt)}
          renderItem={(factor) => (
            <List.Item
              actions={[
                <PhiConfirmControl
                  key="remove"
                  title="Remove this authenticator?"
                  onConfirm={() => void removeFactor(factor.id)}
                  danger
                  trigger={{ label: "Remove", type: "link", danger: true }}
                />,
              ]}
            >
              <List.Item.Meta
                title={factor.label ?? "Authenticator app"}
                description={factor.lastUsedAt ? `Last used ${new Date(factor.lastUsedAt).toLocaleString()}` : "Not used yet"}
              />
              {payload.policy.factor?.requiredMethod === "totp" ? <PhiTagControl color="blue">Required</PhiTagControl> : null}
            </List.Item>
          )}
        />
      </Card>
      <Card title="Linked login providers">
        <List
          locale={{ emptyText: "No external login provider linked." }}
          dataSource={payload.identities}
          renderItem={(identity) => (
            <List.Item>
              <List.Item.Meta title={identity.providerKey} description={identity.issuer} />
            </List.Item>
          )}
        />
      </Card>
      <Card title="Sessions">
        <List
          dataSource={payload.sessions}
          renderItem={(session) => (
            <List.Item
              actions={session.id !== payload.currentSessionId && !session.revokedAt ? [
                <PhiConfirmControl
                  key="revoke"
                  title="Revoke this session?"
                  onConfirm={() => void revokeSession(session.id)}
                  danger
                  trigger={{ label: "Revoke", type: "link", danger: true }}
                />,
              ] : undefined}
            >
              <List.Item.Meta
                title={session.id === payload.currentSessionId ? "Current session" : "Session"}
                description={[session.ipAddress, session.userAgent].filter(Boolean).join(" · ") || "No device details"}
              />
              {session.revokedAt ? <PhiTagControl>Revoked</PhiTagControl> : <PhiTagControl color="green">Active</PhiTagControl>}
            </List.Item>
          )}
        />
      </Card>
    </PhiFlexControl>
  );
}
