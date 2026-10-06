"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_VIEWER_ACCESS_SITE_ADMIN, canPhiViewerAccess } from "../../../../types/access";
import type { PhiRuntimeControllerPlugin } from "../../../../types";
import type { PhiSignalValue } from "../../../../types/signals";
import { readPhiTableActionSignalValue } from "../../../../types/table-signal-values";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiRuntimeConditionStateResponder } from "../../../../components/runtime/runtime-condition-state-responder";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { dispatchPhiSignalCapability } from "../../../../components/runtime/runtime-signal-identity";
import { usePhiTableProvider } from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION,
  type PhiUserManagementControllerConfig,
} from "../controller/definition";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiUserManagementControllerConfig>["renderController"]
>>[0];

type UserManagementWorkflow = "create" | "edit" | "history" | null;
type UserManagementAction = NonNullable<ReturnType<typeof readPhiTableActionSignalValue>>;

type UserManagementWorkflowState = {
  workflow: Exclude<UserManagementWorkflow, null>;
  action: UserManagementAction;
  correlationId: string;
};

type UserManagementFormWorkflow = "create" | "edit";

/*
 * The workflow a signal belongs to, read off its channel: the Page routes the create and the edit half
 * of the dialogs on channels of their own (`createSubmit`, `editCommand`, ...), so nothing here has to
 * know which Widget sent it.
 */
function readFormWorkflow(channel: string, suffix: string): UserManagementFormWorkflow | null {
  if (channel === `create${suffix}`) return "create";
  if (channel === `edit${suffix}`) return "edit";
  return null;
}

function PhiUserManagementControllerView({
  address,
  runtime,
  config,
}: Pick<ControllerRenderArgs, "address" | "runtime" | "config">) {
  const dispatchSignal = usePhiSignalDispatcher();
  const source = useMemo(() => ({
    providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.table,
    resourceKey: "users",
  }), []);
  const { provider } = usePhiTableProvider(source);
  // The route lets a Developer in; only a Site admin may change anything. Stated as the policy the
  // rest of the system speaks rather than as a role check, so a widened admin mask carries here too.
  const readOnly = !canPhiViewerAccess(runtime.viewer, PHI_VIEWER_ACCESS_SITE_ADMIN);
  const [workflowState, setWorkflowState] = useState<UserManagementWorkflowState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const deliveredWorkflowRef = useRef<string | null>(null);
  /*
   * `correlationId` is the exchange the open workflow belongs to, and what a late read is measured
   * against. Comparing the row identity instead let a reply from a first open reach a second open of
   * the same row, because the identity is equal in both and says nothing about which one asked.
   */
  const workflowRef = useRef<{
    workflow: UserManagementWorkflow;
    action: ReturnType<typeof readPhiTableActionSignalValue>;
    selectedSelf: boolean;
    correlationId: string | null;
  }>({ workflow: null, action: null, selectedSelf: true, correlationId: null });

  /*
   * One declared output, delivered through every route the Page wrote for it. The dialogs, Forms and
   * Tables were Widget ids of the users Page held in this file; the Page names them now.
   */
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId: string,
  ) => dispatchPhiSignalCapability(dispatchSignal, address, emitRoutes, capabilityId, value, correlationId), [address, dispatchSignal, emitRoutes]);

  const conditionState = useCallback((pending = submitting) => ({
    ready: true,
    permissions: { readOnly },
    selection: { self: workflowRef.current.selectedSelf },
    submission: { pending },
  }), [readOnly, submitting]);

  const openOverlay = useCallback((workflow: Exclude<UserManagementWorkflow, null>, correlationId: string) => {
    emitCapability(`${workflow}DialogOpen`, null, correlationId);
  }, [emitCapability]);

  const closeOverlay = useCallback((workflow: UserManagementFormWorkflow, correlationId: string) => {
    emitCapability(`${workflow}DialogClose`, null, correlationId);
  }, [emitCapability]);

  const loadSelectionState = useCallback(async (rowIdentity: string | number, correlationId: string) => {
    if (!provider?.readRecord) return;
    try {
      const record = await provider.readRecord({
        resourceKey: "users",
        rowIdentity,
        params: {},
        signal: new AbortController().signal,
      });
      if (workflowRef.current.correlationId !== correlationId) return;
      workflowRef.current.selectedSelf = record.self === true;
      emitCapability("editFormCondition", { state: conditionState() }, correlationId);
    } catch {
      workflowRef.current.selectedSelf = true;
    }
  }, [conditionState, emitCapability, provider]);

  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: conditionState });

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== address) return;

    if (signal.channel === "action" && signal.action === "activate") {
      const action = readPhiTableActionSignalValue(signal.value);
      if (!action) return;
      if (action.actionKey === "create" && !readOnly) {
        setSubmitting(false);
        workflowRef.current = { workflow: "create", action, selectedSelf: false, correlationId: signal.correlationId };
        deliveredWorkflowRef.current = null;
        setWorkflowState({ workflow: "create", action, correlationId: signal.correlationId });
        openOverlay("create", signal.correlationId);
      } else if (action.actionKey === "edit" && action.rowIdentity != null && !readOnly) {
        setSubmitting(false);
        workflowRef.current = { workflow: "edit", action, selectedSelf: true, correlationId: signal.correlationId };
        deliveredWorkflowRef.current = null;
        setWorkflowState({ workflow: "edit", action, correlationId: signal.correlationId });
        openOverlay("edit", signal.correlationId);
        void loadSelectionState(action.rowIdentity, signal.correlationId);
      } else if (action.actionKey === "history" && action.rowIdentity != null) {
        workflowRef.current = { workflow: "history", action, selectedSelf: false, correlationId: signal.correlationId };
        deliveredWorkflowRef.current = null;
        setWorkflowState({ workflow: "history", action, correlationId: signal.correlationId });
        openOverlay("history", signal.correlationId);
      }
      return;
    }

    if (signal.channel === "state" && signal.action === "change" && typeof signal.value === "boolean") {
      if (signal.value === false) {
        setSubmitting(false);
        workflowRef.current = { workflow: null, action: null, selectedSelf: true, correlationId: null };
        deliveredWorkflowRef.current = null;
        setWorkflowState(null);
      }
      return;
    }

    const commandWorkflow = signal.action === "activate" ? readFormWorkflow(signal.channel, "Command") : null;
    if (commandWorkflow && signal.value === "cancel") {
      emitCapability(`${commandWorkflow}FormReset`, null, signal.correlationId);
      closeOverlay(commandWorkflow, signal.correlationId);
      return;
    }

    if (commandWorkflow && signal.value === "save") {
      if (readOnly || submitting) return;
      emitCapability(`${commandWorkflow}FormSubmit`, null, signal.correlationId);
      return;
    }

    const closeWorkflow = signal.action === "close" ? readFormWorkflow(signal.channel, "Dialog") : null;
    if (closeWorkflow) {
      const request = readPhiOverlayCloseRequest(signal.value);
      if (request && !submitting) {
        emitCapability(`${closeWorkflow}FormReset`, null, signal.correlationId);
        closeOverlay(closeWorkflow, signal.correlationId);
      }
      return;
    }

    const submittingWorkflow = signal.action === "change" ? readFormWorkflow(signal.channel, "Submitting") : null;
    if (submittingWorkflow && typeof signal.value === "boolean") {
      setSubmitting(signal.value);
      emitCapability(`${submittingWorkflow}SaveSubmitting`, signal.value, signal.correlationId);
      emitCapability(`${submittingWorkflow}DialogCondition`, { state: conditionState(signal.value) }, signal.correlationId);
      return;
    }

    const successWorkflow = signal.action === "activate" ? readFormWorkflow(signal.channel, "Submit") : null;
    if (successWorkflow) {
      closeOverlay(successWorkflow, signal.correlationId);
      emitCapability("usersReload", null, signal.correlationId);
    }
  }, [address, closeOverlay, conditionState, emitCapability, loadSelectionState, openOverlay, readOnly, submitting]), {
    scopes: ["page"],
    receiver: address,
  });

  useEffect(() => {
    if (!workflowState || workflowState.workflow === "create") return;
    const deliveryKey = [
      workflowState.workflow,
      workflowState.correlationId,
      String(workflowState.action.rowIdentity ?? ""),
    ].join(":");
    if (deliveredWorkflowRef.current === deliveryKey) return;

    if (workflowState.workflow === "edit") {
      deliveredWorkflowRef.current = deliveryKey;
      emitCapability("editRecordOpen", workflowState.action, workflowState.correlationId);
      return;
    }

    if (workflowState.action.rowIdentity == null) return;
    deliveredWorkflowRef.current = deliveryKey;
    emitCapability("historyFilters", { userId: workflowState.action.rowIdentity }, workflowState.correlationId);
  }, [emitCapability, workflowState]);

  return null;
}

export const PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, runtime, config }) => (
    <PhiUserManagementControllerView key={key} address={address} runtime={runtime} config={config} />
  ),
} satisfies PhiRuntimeControllerPlugin<PhiUserManagementControllerConfig>;

export const PhiUserManagementRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_PLUGIN,
);
