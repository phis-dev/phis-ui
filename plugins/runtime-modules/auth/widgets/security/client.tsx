"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Button, Card, Flex, List, Skeleton, Tag, Typography } from "antd";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiConfirmControl } from "../../../../../components/controls/phi-confirm-control";

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
      <Suspense fallback={<Skeleton active title={false} paragraph={{ rows: 4 }} />}>
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
  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (!payload) return <PhiAlertControl level="error" showIcon title={error ?? "Account security is unavailable."} />;

  return (
    <Flex vertical gap="large">
      <div>
        <Typography.Title level={3}>Security</Typography.Title>
        <Typography.Paragraph type="secondary">
          Manage authenticator apps, linked login providers, and sessions for this site.
        </Typography.Paragraph>
      </div>
      {error ? <PhiAlertControl level="error" showIcon title={error} dismissible onDismiss={() => setError(null)} /> : null}
      <Card
        title="Authenticator apps"
        extra={<Button type="primary" onClick={() => setEnrolling(true)}>Add authenticator</Button>}
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
                >
                  <Button danger type="link">Remove</Button>
                </PhiConfirmControl>,
              ]}
            >
              <List.Item.Meta
                title={factor.label ?? "Authenticator app"}
                description={factor.lastUsedAt ? `Last used ${new Date(factor.lastUsedAt).toLocaleString()}` : "Not used yet"}
              />
              {payload.policy.factor?.requiredMethod === "totp" ? <Tag color="blue">Required</Tag> : null}
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
                >
                  <Button danger type="link">Revoke</Button>
                </PhiConfirmControl>,
              ] : undefined}
            >
              <List.Item.Meta
                title={session.id === payload.currentSessionId ? "Current session" : "Session"}
                description={[session.ipAddress, session.userAgent].filter(Boolean).join(" · ") || "No device details"}
              />
              {session.revokedAt ? <Tag>Revoked</Tag> : <Tag color="green">Active</Tag>}
            </List.Item>
          )}
        />
      </Card>
    </Flex>
  );
}
