"use client";

import { useCallback, useMemo, useRef } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import {
  type PhiSignalValue,
} from "../../../../types/signals";
import { readPhiTableSelectionSignalValue } from "../../../../types/table-signal-values";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PHI_GROUPS_OPTIONS_REVISION } from "../services/options-revision";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { dispatchPhiSignalCapability } from "../../../../components/runtime/runtime-signal-identity";
import { usePhiRuntimeConditionStateResponder } from "../../../../components/runtime/runtime-condition-state-responder";
import {
  PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiGroupsControllerConfig,
} from "../controller/definition";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiGroupsControllerConfig>["renderController"]
>>[0];

function readSelectedGroup(value: unknown) {
  const selection = readPhiTableSelectionSignalValue(value);
  const identity = selection?.selectedRowIdentities?.[0];
  if (identity == null) return { groupId: null, retired: false };
  const groupId = Number.parseInt(String(identity), 10);
  if (!Number.isSafeInteger(groupId) || groupId <= 0) return { groupId: null, retired: false };
  // The group table names `retired` in its `emitFields`; a row it has not loaded says nothing.
  const row = selection?.selectedRows?.find((candidate) => String(candidate.rowIdentity) === String(identity));
  return { groupId, retired: row?.values.retired === true };
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
  ) => dispatchPhiSignalCapability(dispatchSignal, address, emitRoutes, capabilityId, value, correlationId), [address, dispatchSignal, emitRoutes]);

  // No selection means no group, and the membership table answers that with an empty list rather than
  // with every membership on the Site.
  const sendGroupFilter = useCallback((groupId: number | null, correlationId: string) =>
    emitCapability("filtersChange", { groupId }, correlationId), [emitCapability]);
  // Kept for the membership Form, which mounts only when its dialog opens and then asks for it.
  const selectedGroupIdRef = useRef<number | null>(null);
  // A retired group takes no new members, so the membership table's `+` is off while one is selected.
  const selectedGroupRetiredRef = useRef(false);
  const conditionState = useCallback(() => ({ ready: true, selectedGroupRetired: selectedGroupRetiredRef.current }), []);
  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: conditionState });

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
      // And the dialog it was written in is done. Closing one that is not open does nothing.
      emitCapability("dialogClose", null, signal.correlationId);
      return;
    }
    // Only a selection chooses the group. A condition question or reload reaching this listener fell
    // through to here and sent `{ groupId: null }`, which emptied the membership table under a choice.
    if (signal.channel === "selection") {
      const { groupId, retired } = readSelectedGroup(signal.value);
      /*
       * The table says the same selection again when a row's fields change. Only a different group is a
       * new filter: sending it again would put the membership table back on its first page.
       */
      if (groupId !== selectedGroupIdRef.current) {
        selectedGroupIdRef.current = groupId;
        sendGroupFilter(groupId, signal.correlationId);
      }
      if (retired !== selectedGroupRetiredRef.current) {
        selectedGroupRetiredRef.current = retired;
        emitCapability("conditionStateChange", { state: conditionState() }, signal.correlationId);
      }
      return;
    }
    // No group selected, nothing to say: the Form starts empty, as it would without asking.
    if (signal.channel === "values" && selectedGroupIdRef.current != null) {
      // The group field's options carry their ids as strings.
      emitCapability("membershipValues", { values: { groupId: String(selectedGroupIdRef.current) } }, signal.correlationId);
    }
  }, {
    scopes: ["page"],
    channels: ["selection", "condition", "submit", "command", "values"],
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
