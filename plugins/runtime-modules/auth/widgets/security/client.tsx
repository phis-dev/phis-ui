"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCardControl } from "../../../../../components/controls/phi-card-control";
import { PhiEntryListControl } from "../../../../../components/controls/phi-entry-list-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiConfirmControl } from "../../../../../components/controls/phi-confirm-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiSkeletonControl } from "../../../../../components/controls/phi-skeleton-control";
import { readPhiJsonError, requestPhiJson } from "../../../../../helpers/client-json-request";
import type { PhiAuthWorkflowBodyLabels } from "../../../../../components/widgets/label-types/auth-workflow";
import {
  formatPhiAuthSecurityWidgetLabel,
  type PhiAuthSecurityWidgetLabels,
} from "../../../../../components/widgets/label-types/security";

const PhiAuthWorkflowBody = lazy(
  () => import("../../../../../components/widgets/client/auth-workflow-body")
    .then((module) => ({ default: module.PhiAuthWorkflowBody })),
);

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

export function PhiAuthSecurityWidgetClient({
  apiPath = "/api/auth/account/security",
  labels,
  workflowLabels,
}: {
  apiPath?: string;
  labels: PhiAuthSecurityWidgetLabels;
  /** The shared second-factor body's own words; adding a device is drawn by that component. */
  workflowLabels: PhiAuthWorkflowBodyLabels;
}) {
  const [payload, setPayload] = useState<SecurityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const { ok, payload: next } = await requestPhiJson<SecurityPayload>(apiPath, { signal });
      if (!ok || !next?.ok) throw new Error(labels.errors.loadFailed);
      setPayload(next);
      setError(null);
    } catch (caught) {
      if (!signal?.aborted) setError(caught instanceof Error ? caught.message : labels.errors.loadFailed);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiPath, labels.errors.loadFailed]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void load(controller.signal));
    return () => controller.abort();
  }, [load]);

  /*
   * Both removals are one delete behind a confirm, which no Form expresses: there is nothing to fill
   * in. The answer is the list read again, because the server decides what remains.
   */
  async function removeAndReload(path: string, failedMessage: string) {
    try {
      const reply = await requestPhiJson(path, {
        method: "DELETE",
        csrf: true,
        csrfUnavailableMessage: labels.errors.csrfFailed,
      });
      if (!reply.ok) throw new Error(readPhiJsonError(reply.payload, failedMessage));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : failedMessage);
    }
  }

  function removeFactor(factorId: string) {
    return removeAndReload(
      `/api/auth/account/factors/${encodeURIComponent(factorId)}`,
      labels.errors.factorRemoveFailed,
    );
  }

  function revokeSession(sessionId: string) {
    return removeAndReload(
      `/api/auth/account/sessions/${encodeURIComponent(sessionId)}`,
      labels.errors.sessionRevokeFailed,
    );
  }

  if (enrolling) {
    return (
      <Suspense fallback={<PhiSkeletonControl lines={4} />}>
        <PhiAuthWorkflowBody
          mode="enroll"
          next="/app/security"
          labels={workflowLabels}
          onComplete={async () => {
            setEnrolling(false);
            await load();
          }}
        />
      </Suspense>
    );
  }
  if (loading) return <PhiSkeletonControl lines={8} withTitle />;
  if (!payload) return <PhiAlertControl level="error" showIcon title={error ?? labels.errors.unavailable} />;

  return (
    <PhiFlexControl vertical gap="large">
      {/* No heading: the Settings panel this stands in is titled with what it is. */}
      <PhiTypographyControl presentation="paragraph" type="secondary">
        {labels.intro}
      </PhiTypographyControl>
      {error ? <PhiAlertControl level="error" showIcon title={error} dismissible onDismiss={() => setError(null)} /> : null}
      <PhiCardControl
        title={labels.authenticators.title}
        toolbar={<PhiButtonControl type="primary" onClick={() => setEnrolling(true)} label={labels.authenticators.add} />}
      >
        <PhiEntryListControl
          emptyDescription={labels.authenticators.empty}
          entries={payload.factors
            .filter((factor) => factor.type === 2 && factor.confirmedAt)
            .map((factor) => ({
              key: String(factor.id),
              title: factor.label ?? labels.authenticators.unnamed,
              description: factor.lastUsedAt
                ? formatPhiAuthSecurityWidgetLabel(
                    labels.authenticators.lastUsed,
                    new Date(factor.lastUsedAt).toLocaleString(),
                  )
                : labels.authenticators.neverUsed,
              status: payload.policy.factor?.requiredMethod === "totp"
                ? <PhiTagControl color="blue">{labels.authenticators.required}</PhiTagControl>
                : null,
              action: (
                <PhiConfirmControl
                  title={labels.authenticators.removeConfirm}
                  onConfirm={() => void removeFactor(factor.id)}
                  danger
                  trigger={{ label: labels.authenticators.remove, type: "link", danger: true }}
                />
              ),
            }))}
        />
      </PhiCardControl>
      <PhiCardControl title={labels.providers.title}>
        <PhiEntryListControl
          emptyDescription={labels.providers.empty}
          entries={payload.identities.map((identity) => ({
            key: identity.providerKey,
            title: identity.providerKey,
            description: identity.issuer,
          }))}
        />
      </PhiCardControl>
      <PhiCardControl title={labels.sessions.title}>
        <PhiEntryListControl
          emptyDescription={labels.sessions.empty}
          entries={payload.sessions.map((session) => ({
            key: String(session.id),
            title: session.id === payload.currentSessionId ? labels.sessions.current : labels.sessions.other,
            description: [session.ipAddress, session.userAgent].filter(Boolean).join(" · ")
              || labels.sessions.noDeviceDetails,
            status: session.revokedAt
              ? <PhiTagControl>{labels.sessions.revoked}</PhiTagControl>
              : <PhiTagControl color="green">{labels.sessions.active}</PhiTagControl>,
            action: session.id !== payload.currentSessionId && !session.revokedAt
              ? (
                <PhiConfirmControl
                  title={labels.sessions.revokeConfirm}
                  onConfirm={() => void revokeSession(session.id)}
                  danger
                  trigger={{ label: labels.sessions.revoke, type: "link", danger: true }}
                />
              )
              : null,
          }))}
        />
      </PhiCardControl>
    </PhiFlexControl>
  );
}
