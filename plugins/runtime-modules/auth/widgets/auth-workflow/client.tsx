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
import { PHI_AUTH_MACHINE_STATEMENTS } from "../../machine";

export type PhiAuthWorkflowWidgetClientProps = {
  signalRoutes?: PhiSignalRouteSet | null;
};

/**
 * What the Auth Controller says the workflow is.
 *
 * This Widget used to read the login handler's answer itself and keep the result, which meant a reload
 * part-way through a second factor emptied it -- for a state Core would still have answered for. The
 * Controller holds it now, from `serverPreload` on the way in and from the same form answer afterwards,
 * and this draws whatever it is told.
 */
function readWorkflow(value: unknown): PhiAuthWorkflow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const workflow = (value as { workflow?: unknown }).workflow;
  return workflow && typeof workflow === "object" && !Array.isArray(workflow)
    ? workflow as PhiAuthWorkflow
    : null;
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

  /*
   * Both ways the Controller's answer arrives: the broadcast it sends whenever the workflow changes,
   * and the reply to the question below. A signal addressed to some other Widget is not this one's.
   */
  usePhiSignalListener(
    (signal) => {
      if (signal.receiver !== "broadcast" && signal.receiver !== identity.receiver) return;
      setWorkflow(readWorkflow(signal.value));
    },
    useMemo(() => ({
      scopes: ["area"] as const,
      channels: ["workflow"],
      actions: ["change"] as const,
      valueSchemas: [PHI_SIGNAL_VALUE_SCHEMAS.authWorkflowState],
    }), []),
    /*
     * Answering for this address is not optional: the reply to the request below is addressed here, and
     * a reader that does not name what it reads for leaves the bus holding those signals forever.
     */
    identity.receiver ?? null,
  );

  /*
   * Asked once on mount, because a broadcast is not held for somebody who was not there.
   *
   * An Overlay body mounts on first open, long after the Controller said what it had, so without this
   * the second factor would be missing precisely where the Login is a modal.
   */
  useEffect(() => {
    emitCapability("authWorkflowRequest", null);
  }, [emitCapability]);

  /*
   * The machine's statement, passed on to the Widgets that arrange themselves around it.
   *
   * Not this Widget's opinion: `awaitingCredentials` is what the Auth machine publishes, and this only
   * carries it the last hop. It goes through here because a Page node cannot ask an Area Controller --
   * the question would materialize that Controller at page scope, which it does not allow.
   */
  useEffect(() => {
    emitCapability("conditionStateChange", {
      state: { [PHI_AUTH_MACHINE_STATEMENTS.awaitingCredentials]: !active },
    });
  }, [active, emitCapability]);

  if (!active || !workflow) {
    return null;
  }

  return (
    <PhiAuthWorkflowBody
      mode={workflow.state === "factor-enrollment-required" ? "enroll" : "challenge"}
      next={workflow.next}
      onComplete={({ area, next }) => {
        setWorkflow(null);
        emitCapability("submitSuccess", { ok: true, payload: { area, next } });
      }}
    />
  );
}
