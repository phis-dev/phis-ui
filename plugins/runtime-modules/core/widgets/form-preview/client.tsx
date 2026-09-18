"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Descriptions } from "antd";
import { buildPhiDataSourceUrl, type PhiApiDataSource } from "../../../../../gateway/data-source";
import type { PhiCmsInstanceId } from "../../../../../types";
import type { PhiSignalRouteSet, PhiSignalValue } from "../../../../../types/signals";
import { findPhiSignalRoutesByCapabilityId } from "../../../../../types/signals";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiRuntimePageConditionState } from "../../../../../components/runtime/runtime-page-condition-state";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiSkeletonControl } from "../../../../../components/controls/phi-skeleton-control";

const PHI_LABEL_WIDTH = "7.5rem";

export type PhiFormPreviewWidgetClientProps = {
  blockId: PhiCmsInstanceId;
  formId: string;
  tokenParam: string;
  dataSource: PhiApiDataSource;
  labels?: Readonly<Record<string, string>>;
  signalRoutes?: PhiSignalRouteSet | null;
};

/**
 * What the form's preview phase answered, in the two parts a placement cares about.
 *
 * `status` is the form's own vocabulary -- it is the form that knows what "already confirmed" means --
 * and it travels unchanged, so a condition beside this Widget is written against the words the form
 * uses rather than against a translation of them.
 */
type PhiFormPreviewState = {
  status: string | null;
  ok: boolean;
  fields: Readonly<Record<string, string>>;
};

function readPreviewFields(value: unknown): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const fields: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const text = typeof entry === "string" ? entry.trim() : "";
    if (text) fields[key] = text;
  }
  return fields;
}

export function PhiFormPreviewWidgetClient({
  blockId,
  formId,
  tokenParam,
  dataSource,
  labels,
  signalRoutes,
}: PhiFormPreviewWidgetClientProps) {
  const page = usePhiRuntimePageConditionState();
  const token = page.query[tokenParam]?.trim() ?? "";
  const identity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter(identity.sender);
  const emitRoutes = useMemo(() => signalRoutes?.emits ?? [], [signalRoutes?.emits]);
  /*
   * The finding is kept with the token it is about, so a changed address is a fresh unanswered read
   * rather than the previous answer held over for a link it was never about.
   */
  const [answer, setAnswer] = useState<{ token: string; state: PhiFormPreviewState } | null>(null);
  const state = answer?.token === token ? answer.state : null;
  const loading = token.length > 0 && state === null;

  const emitCapability = useCallback((capabilityId: string, value: PhiSignalValue) => {
    for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId)) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) continue;
      emitSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : value,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
      });
    }
  }, [emitRoutes, emitSignal]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    async function readPreview() {
      const url = buildPhiDataSourceUrl(dataSource, {
        query: { phase: "preview", formId, token },
      });

      try {
        const response = await fetch(url, { cache: "no-store" });
        const payload = await response.json().catch(() => null) as {
          ok?: boolean;
          status?: string;
          code?: string;
          preview?: unknown;
        } | null;
        if (!active) return;
        setAnswer({
          token,
          state: {
            ok: payload?.ok === true,
            status: payload?.status ?? payload?.code ?? "error",
            fields: readPreviewFields(payload?.preview),
          },
        });
      } catch {
        if (active) setAnswer({ token, state: { ok: false, status: "error", fields: {} } });
      }
    }

    void readPreview();
    return () => {
      active = false;
    };
  }, [dataSource, formId, token]);

  /*
   * The finding goes out whenever it changes, and nothing is announced while it is still being read:
   * a form that appears for `pending` must not flash into view before the preview says so.
   */
  useEffect(() => {
    if (!state) return;
    emitCapability("conditionStateChange", { state: { status: state.status, ok: state.ok } });
  }, [emitCapability, state]);

  if (!token) {
    return null;
  }

  if (loading || !state) {
    return <PhiSkeletonControl key={`preview-${blockId}`} lines={3} />;
  }

  if (!state.ok) {
    const status = state.status ?? "error";
    return (
      <PhiAlertControl
        level={status === "already_confirmed" ? "info" : "warning"}
        showIcon
        title={labels?.[`preview.status.${status}.title`] ?? labels?.["preview.status.error.title"] ?? "This link cannot be used"}
        description={labels?.[`preview.status.${status}.text`] ?? labels?.["preview.status.error.text"]}
      />
    );
  }

  const entries = Object.entries(state.fields);

  return (
    <Descriptions
      key={`preview-${blockId}`}
      title={labels?.["preview.title"]}
      column={1}
      size="small"
      styles={{
        label: { width: PHI_LABEL_WIDTH, color: "var(--ant-color-text-secondary)", fontWeight: 500 },
        content: { color: "var(--ant-color-text)" },
      }}
    >
      {entries.map(([key, value]) => (
        <Descriptions.Item key={key} label={labels?.[`preview.fields.${key}`] ?? key}>
          {value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}
