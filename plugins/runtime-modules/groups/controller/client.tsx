"use client";

import { useCallback, useMemo } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import {
  findPhiSignalRoutesByCapabilityId,
  type PhiSignalValue,
} from "../../../../types/signals";
import { readPhiTableSelectionSignalValue } from "../../../../types/table-widget";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PHI_GROUPS_OPTIONS_REVISION } from "../services/options-revision";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiRuntimeConditionStateResponder } from "../../../../components/runtime/runtime-condition-state-responder";
import {
  PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiGroupsControllerConfig,
} from "../controller/definition";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiGroupsControllerConfig>["renderController"]
>>[0];

/* This Controller gates nothing, so the answer never varies -- but a Widget still has to hear it. */
const GROUPS_CONDITION_STATE = { ready: true } as const;

function readSelectedGroupId(value: unknown) {
  const selection = readPhiTableSelectionSignalValue(value);
  const identity = selection?.selectedRowIdentities?.[0];
  if (identity == null) return null;
  const groupId = Number.parseInt(String(identity), 10);
  return Number.isSafeInteger(groupId) && groupId > 0 ? groupId : null;
}

function PhiGroupsControllerView({
  address,
  config,
}: Pick<ControllerRenderArgs, "address" | "config">) {
  const dispatchSignal = usePhiSignalDispatcher();
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);

  /* One declared output, delivered through every route the Page wrote for it. */
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId: string,
  ) => {
    for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId)) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) {
        continue;
      }
      dispatchSignal({
        scope: route.scope,
        sender: address,
        receiver: route.receiver,
        channel: route.channel,
        action: route.action,
        value: route.valueType === "none" ? null : value,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        correlationId,
        timestamp: Date.now(),
      });
    }
  }, [address, dispatchSignal, emitRoutes]);

  // No selection means no group, and the membership table answers that with an empty list rather than
  // with every membership on the Site.
  const sendGroupFilter = useCallback((groupId: number | null, correlationId: string) =>
    emitCapability("filtersChange", { groupId }, correlationId), [emitCapability]);

  // Nothing about this Controller gates a Widget; answering keeps the asking Widget from waiting.
  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: GROUPS_CONDITION_STATE });

  usePhiSignalListener((signal) => {
    if (signal.channel === "command") {
      // The Forms are submitted from outside, so a toolbar asks and this carries it to the right one.
      if (signal.value === "save") {
        emitCapability("createSubmit", null, signal.correlationId);
      } else if (signal.value === "saveMembership") {
        emitCapability("membershipSubmit", null, signal.correlationId);
      }
      return;
    }
    if (signal.channel === "submit") {
      /*
       * A Form relays straight to the route, so this is where its success arrives and the only place
       * that can say so. The options the Forms themselves offer are stale for the same reason the
       * tables are -- a group just created is not in the list the group field loaded on arrival.
       */
      PHI_GROUPS_OPTIONS_REVISION.bump();
      // Something was written: every list this Page named is stale, and none knows which it was.
      emitCapability("reload", null, signal.correlationId);
      return;
    }
    sendGroupFilter(readSelectedGroupId(signal.value), signal.correlationId);
  }, {
    scopes: ["page"],
    channels: ["selection", "condition", "submit", "command"],
    actions: ["change", "reload", "activate"],
    receiver: address,
  });

  return null;
}

export const PHI_GROUPS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, config }) =>
    <PhiGroupsControllerView key={key} address={address} config={config} />,
} satisfies PhiRuntimeControllerPlugin<PhiGroupsControllerConfig>;

export const PhiGroupsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_GROUPS_RUNTIME_CONTROLLER_PLUGIN,
);
