"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_VIEWER_ACCESS_SITE_ADMIN, canPhiViewerAccess } from "../../../../types/access";
import type { PhiRuntimeControllerPlugin, PhiSignal, PhiSignalAddress } from "../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress, createPhiSignalSubcontrolAddress } from "../../../../types/signals";
import { readPhiTableActionSignalValue } from "../../../../types/table-widget";
import { readPhiOverlayCloseRequest } from "../../../../types/cms-overlay";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalReceiverReady } from "../../../../components/runtime/runtime-signal-registry";
import { usePhiTableProvider } from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION,
  type PhiUserManagementControllerConfig,
} from "../controller/definition";
import {
  PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS,
  PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS,
} from "../addresses";

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

function cmsAddress(id: Parameters<typeof createPhiSignalAddress>[1]) {
  return createPhiSignalAddress("cms", id);
}

const EDIT_FORM_ADDRESS = cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditForm);
const CREATE_FORM_ADDRESS = cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateForm);
const HISTORY_TABLE_ADDRESS = cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetHistoryTable);
const CREATE_OVERLAY_ADDRESS = cmsAddress(PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayCreate);
const EDIT_OVERLAY_ADDRESS = cmsAddress(PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayEdit);
const CREATE_CANCEL_ADDRESS = createPhiSignalSubcontrolAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateCommands, "cancel");
const CREATE_SAVE_ADDRESS = createPhiSignalSubcontrolAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateCommands, "save");
const EDIT_CANCEL_ADDRESS = createPhiSignalSubcontrolAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditCommands, "cancel");
const EDIT_SAVE_ADDRESS = createPhiSignalSubcontrolAddress("cms", PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditCommands, "save");

function PhiUserManagementControllerView({
  address,
  runtime,
}: Pick<ControllerRenderArgs, "address" | "runtime">) {
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
  const editFormReady = usePhiSignalReceiverReady(EDIT_FORM_ADDRESS);
  const historyTableReady = usePhiSignalReceiverReady(HISTORY_TABLE_ADDRESS);
  const deliveredWorkflowRef = useRef<string | null>(null);
  const workflowRef = useRef<{
    workflow: UserManagementWorkflow;
    action: ReturnType<typeof readPhiTableActionSignalValue>;
    selectedSelf: boolean;
  }>({ workflow: null, action: null, selectedSelf: true });

  const send = useCallback((input: {
    receiver: PhiSignalAddress;
    channel: string;
    action: PhiSignal["action"];
    value: PhiSignal["value"];
    valueType: PhiSignal["valueType"];
    valueSchema?: PhiSignal["valueSchema"];
    correlationId: string;
  }) => dispatchSignal({
    scope: "page",
    sender: address,
    receiver: input.receiver,
    channel: input.channel,
    action: input.action,
    value: input.value,
    valueType: input.valueType,
    valueSchema: input.valueSchema ?? null,
    correlationId: input.correlationId,
    timestamp: Date.now(),
  }), [address, dispatchSignal]);

  const conditionState = useCallback((pending = submitting) => ({
    ready: true,
    permissions: { readOnly },
    selection: { self: workflowRef.current.selectedSelf },
    submission: { pending },
  }), [readOnly, submitting]);

  const sendConditionState = useCallback((receiver: PhiSignalAddress, correlationId: string) => {
    send({
      receiver,
      channel: "condition",
      action: "change",
      value: { state: conditionState() },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      correlationId,
    });
  }, [conditionState, send]);

  const openOverlay = useCallback((workflow: Exclude<UserManagementWorkflow, null>, correlationId: string) => {
    const overlayId = workflow === "create"
      ? PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayCreate
      : workflow === "edit"
        ? PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayEdit
        : PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayHistory;
    send({
      receiver: cmsAddress(overlayId),
      channel: "dialog",
      action: "activate",
      value: null,
      valueType: "none",
      correlationId,
    });
  }, [send]);

  const closeOverlay = useCallback((workflow: Exclude<UserManagementWorkflow, null>, correlationId: string) => {
    const overlayId = workflow === "create"
      ? PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayCreate
      : PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS.overlayEdit;
    send({
      receiver: cmsAddress(overlayId),
      channel: "dialog",
      action: "close",
      value: null,
      valueType: "none",
      correlationId,
    });
  }, [send]);

  const formAddressForWorkflow = useCallback((workflow: "create" | "edit") =>
    workflow === "create" ? CREATE_FORM_ADDRESS : EDIT_FORM_ADDRESS, []);

  const overlayWorkflowFromSender = useCallback((sender: PhiSignal["sender"]) =>
    sender === CREATE_OVERLAY_ADDRESS
      ? "create"
      : sender === EDIT_OVERLAY_ADDRESS
        ? "edit"
        : null, []);

  const commandWorkflowFromSender = useCallback((sender: PhiSignal["sender"]) =>
    sender === CREATE_OVERLAY_ADDRESS ||
    sender === CREATE_FORM_ADDRESS ||
    sender === CREATE_CANCEL_ADDRESS ||
    sender === CREATE_SAVE_ADDRESS
      ? "create"
      : sender === EDIT_OVERLAY_ADDRESS ||
          sender === EDIT_FORM_ADDRESS ||
          sender === EDIT_CANCEL_ADDRESS ||
          sender === EDIT_SAVE_ADDRESS
        ? "edit"
        : null, []);

  const loadSelectionState = useCallback(async (rowIdentity: string | number, correlationId: string) => {
    if (!provider?.readRecord) return;
    try {
      const record = await provider.readRecord({
        resourceKey: "users",
        rowIdentity,
        params: {},
        signal: new AbortController().signal,
      });
      if (workflowRef.current.action?.rowIdentity !== rowIdentity) return;
      workflowRef.current.selectedSelf = record.self === true;
      sendConditionState(
        cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditForm),
        correlationId,
      );
    } catch {
      workflowRef.current.selectedSelf = true;
    }
  }, [provider, sendConditionState]);

  usePhiSignalListener(useCallback((signal) => {
    if (signal.receiver !== address) return;

    if (signal.channel === "condition" && signal.action === "reload" && signal.sender) {
      sendConditionState(signal.sender, signal.correlationId);
      return;
    }

    if (signal.channel === "action" && signal.action === "activate") {
      const action = readPhiTableActionSignalValue(signal.value);
      if (!action) return;
      if (action.actionKey === "create" && !readOnly) {
        setSubmitting(false);
        workflowRef.current = { workflow: "create", action, selectedSelf: false };
        deliveredWorkflowRef.current = null;
        setWorkflowState({ workflow: "create", action, correlationId: signal.correlationId });
        openOverlay("create", signal.correlationId);
      } else if (action.actionKey === "edit" && action.rowIdentity != null && !readOnly) {
        setSubmitting(false);
        workflowRef.current = { workflow: "edit", action, selectedSelf: true };
        deliveredWorkflowRef.current = null;
        setWorkflowState({ workflow: "edit", action, correlationId: signal.correlationId });
        openOverlay("edit", signal.correlationId);
        void loadSelectionState(action.rowIdentity, signal.correlationId);
      } else if (action.actionKey === "history" && action.rowIdentity != null) {
        workflowRef.current = { workflow: "history", action, selectedSelf: false };
        deliveredWorkflowRef.current = null;
        setWorkflowState({ workflow: "history", action, correlationId: signal.correlationId });
        openOverlay("history", signal.correlationId);
      }
      return;
    }

    if (signal.channel === "state" && signal.action === "change" && typeof signal.value === "boolean") {
      if (signal.value === false) {
        setSubmitting(false);
        workflowRef.current = { workflow: null, action: null, selectedSelf: true };
        deliveredWorkflowRef.current = null;
        setWorkflowState(null);
      }
      return;
    }

    if (signal.channel === "command" && signal.action === "activate" && signal.value === "cancel") {
      const workflow = commandWorkflowFromSender(signal.sender);
      if (workflow) {
        send({
          receiver: formAddressForWorkflow(workflow),
          channel: "reset",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        closeOverlay(workflow, signal.correlationId);
      }
      return;
    }

    if (signal.channel === "command" && signal.action === "activate" && signal.value === "save") {
      const workflow = commandWorkflowFromSender(signal.sender);
      if (!workflow || readOnly || submitting) return;
      send({
        receiver: formAddressForWorkflow(workflow),
        channel: "submit",
        action: "activate",
        value: null,
        valueType: "none",
        correlationId: signal.correlationId,
      });
      return;
    }

    if (signal.channel === "dialog" && signal.action === "close") {
      const workflow = overlayWorkflowFromSender(signal.sender);
      const request = readPhiOverlayCloseRequest(signal.value);
      if (workflow && request && !submitting) {
        send({
          receiver: formAddressForWorkflow(workflow),
          channel: "reset",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        closeOverlay(workflow, signal.correlationId);
      }
      return;
    }

    if (signal.channel === "submitting" && signal.action === "change" && typeof signal.value === "boolean") {
      const workflow = signal.sender === CREATE_FORM_ADDRESS
        ? "create"
        : signal.sender === EDIT_FORM_ADDRESS
          ? "edit"
          : null;
      if (!workflow) return;
      setSubmitting(signal.value);
      send({
        receiver: workflow === "create" ? CREATE_SAVE_ADDRESS : EDIT_SAVE_ADDRESS,
        channel: "submitting",
        action: "change",
        value: signal.value,
        valueType: "boolean",
        correlationId: signal.correlationId,
      });
      send({
        receiver: workflow === "create" ? CREATE_OVERLAY_ADDRESS : EDIT_OVERLAY_ADDRESS,
        channel: "condition",
        action: "change",
        value: { state: conditionState(signal.value) },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
        correlationId: signal.correlationId,
      });
      return;
    }

    if (signal.channel === "submit" && signal.action === "activate") {
      const workflow = signal.sender === cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetCreateForm)
        ? "create"
        : signal.sender === cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetEditForm)
          ? "edit"
          : null;
      if (!workflow) return;
      closeOverlay(workflow, signal.correlationId);
      send({
        receiver: cmsAddress(PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS.widgetTable),
        channel: "reload",
        action: "activate",
        value: null,
        valueType: "none",
        correlationId: signal.correlationId,
      });
    }
  }, [address, closeOverlay, commandWorkflowFromSender, conditionState, formAddressForWorkflow, loadSelectionState, openOverlay, overlayWorkflowFromSender, readOnly, send, sendConditionState, submitting]), {
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
      if (!editFormReady) return;
      deliveredWorkflowRef.current = deliveryKey;
      send({
        receiver: EDIT_FORM_ADDRESS,
        channel: "action",
        action: "activate",
        value: workflowState.action,
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
        correlationId: workflowState.correlationId,
      });
      return;
    }

    if (!historyTableReady || workflowState.action.rowIdentity == null) return;
    deliveredWorkflowRef.current = deliveryKey;
    send({
      receiver: HISTORY_TABLE_ADDRESS,
      channel: "filters",
      action: "change",
      value: { userId: workflowState.action.rowIdentity },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
      correlationId: workflowState.correlationId,
    });
  }, [editFormReady, historyTableReady, send, workflowState]);

  return null;
}

export const PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, runtime }) => (
    <PhiUserManagementControllerView key={key} address={address} runtime={runtime} />
  ),
} satisfies PhiRuntimeControllerPlugin<PhiUserManagementControllerConfig>;

export const PhiUserManagementRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_PLUGIN,
);
