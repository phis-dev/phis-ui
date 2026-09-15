"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PhiAuthWorkflowBody } from "../../../../../components/widgets/client/auth-workflow-body";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import {
  usePhiSignalEmitter,
  usePhiSignalIdentity,
} from "../../../../../components/runtime/runtime-signal-identity";
import {
  findPhiSignalRoutesByCapabilityId,
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalRouteSet,
  type PhiSignalValue,
} from "../../../../../types/signals";
import type { PhiAuthWorkflow } from "../../../../../types/auth-manifest";

export type PhiAuthWorkflowWidgetClientProps = {
  signalRoutes?: PhiSignalRouteSet | null;
};

function readWorkflow(value: unknown): PhiAuthWorkflow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as { ok?: boolean; payload?: Record<string, unknown> | null };
  if (result.ok !== true) return null;
  const payload = result.payload;
  if (!payload || payload.complete !== false) return null;
  const workflow = payload.workflow;
  return workflow && typeof workflow === "object" ? workflow as PhiAuthWorkflow : null;
}

export function PhiAuthWorkflowWidgetClient({ signalRoutes }: PhiAuthWorkflowWidgetClientProps) {
  const identity = usePhiSignalIdentity();
  const emitSignal = usePhiSignalEmitter(identity.sender);
  const emitRoutes = useMemo(() => signalRoutes?.emits ?? [], [signalRoutes?.emits]);
  const [workflow, setWorkflow] = useState<PhiAuthWorkflow | null>(null);
  const active = workflow != null && workflow.state !== "complete";

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

  usePhiSignalListener(
    (signal) => {
      const next = readWorkflow(signal.value);
      if (next) setWorkflow(next);
    },
    useMemo(() => ({
      channels: ["submit"],
      actions: ["activate"] as const,
      valueSchemas: [PHI_SIGNAL_VALUE_SCHEMAS.formResult],
      ...(identity.receiver ? { receiver: identity.receiver } : {}),
    }), [identity.receiver]),
    identity.receiver ?? null,
  );

  /*
   * Whether this step is under way, for the Widgets that must stand back while it is.
   *
   * The password form and the external methods beside it are answers to a question that has already
   * been answered; leaving them on screen invites somebody to start over halfway through.
   */
  useEffect(() => {
    emitCapability("conditionStateChange", { state: { active } });
  }, [active, emitCapability]);

  if (!active || !workflow) {
    return null;
  }

  return (
    <PhiAuthWorkflowBody
      workflow={workflow}
      onComplete={({ area, next }) => {
        setWorkflow(null);
        emitCapability("submitSuccess", { ok: true, payload: { area, next } });
      }}
    />
  );
}
