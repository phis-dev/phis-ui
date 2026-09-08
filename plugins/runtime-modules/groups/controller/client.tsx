"use client";

import { useCallback } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../../../types/signals";
import { readPhiTableSelectionSignalValue } from "../../../../types/table-widget";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { PHI_GROUPS_OPTIONS_REVISION } from "../services/options-revision";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiRuntimeConditionStateResponder } from "../../../../components/runtime/runtime-condition-state-responder";
import {
  PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiGroupsControllerConfig,
} from "../controller/definition";
import {
  PHI_APP_GROUPS_PAGE_WIDGET_IDS,
  PHI_GROUPS_PAGE_WIDGET_IDS,
} from "../addresses";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiGroupsControllerConfig>["renderController"]
>>[0];

/*
 * Both Pages mount this Controller and each has its own membership table, so the filter goes to both
 * addresses. Only one of them exists on any given Page; a signal to an address nobody listens on is
 * simply not delivered, which is cheaper than teaching the Controller which Page it is on.
 */
const MEMBERS_TABLE_ADDRESSES = [
  createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable),
  createPhiSignalAddress("cms", PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembersTable),
];
const GROUPS_TABLE_ADDRESS = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetGroupsTable);
const CREATE_FORM_ADDRESS = createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetCreateForm);
const MEMBERSHIP_FORM_ADDRESSES = [
  createPhiSignalAddress("cms", PHI_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm),
  createPhiSignalAddress("cms", PHI_APP_GROUPS_PAGE_WIDGET_IDS.widgetMembershipForm),
];

/* This Controller gates nothing, so the answer never varies -- but a Widget still has to hear it. */
const GROUPS_CONDITION_STATE = { ready: true } as const;

function readSelectedGroupId(value: unknown) {
  const selection = readPhiTableSelectionSignalValue(value);
  const identity = selection?.selectedRowIdentities?.[0];
  if (identity == null) return null;
  const groupId = Number.parseInt(String(identity), 10);
  return Number.isSafeInteger(groupId) && groupId > 0 ? groupId : null;
}

function PhiGroupsControllerView({ address }: Pick<ControllerRenderArgs, "address">) {
  const dispatchSignal = usePhiSignalDispatcher();

  const sendGroupFilter = useCallback((groupId: number | null, correlationId: string) => {
    for (const receiver of MEMBERS_TABLE_ADDRESSES) {
      dispatchSignal({
        scope: "page",
        sender: address,
        receiver,
        channel: "filters",
        action: "change",
        // No selection means no group, and the membership table answers that with an empty list rather
        // than with every membership on the Site.
        value: { groupId },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
        correlationId,
        timestamp: Date.now(),
      });
    }
  }, [address, dispatchSignal]);

  // Nothing about this Controller gates a Widget; answering keeps the asking Widget from waiting.
  usePhiRuntimeConditionStateResponder({ address, scope: "page", state: GROUPS_CONDITION_STATE });

  usePhiSignalListener((signal) => {
    if (signal.channel === "command") {
      // The Forms are submitted from outside, so a toolbar asks and this carries it to the right one.
      const forms = signal.value === "save"
        ? [CREATE_FORM_ADDRESS]
        : signal.value === "saveMembership"
          ? MEMBERSHIP_FORM_ADDRESSES
          : [];
      for (const form of forms) {
        dispatchSignal({
          scope: "page",
          sender: address,
          receiver: form,
          channel: "submit",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
          timestamp: Date.now(),
        });
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
      // Something was written: both lists are stale, and neither knows which of them it was.
      for (const receiver of [GROUPS_TABLE_ADDRESS, ...MEMBERS_TABLE_ADDRESSES]) {
        dispatchSignal({
          scope: "page",
          sender: address,
          receiver,
          channel: "reload",
          action: "activate",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
          timestamp: Date.now(),
        });
      }
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
  renderController: ({ key, address }) => <PhiGroupsControllerView key={key} address={address} />,
} satisfies PhiRuntimeControllerPlugin<PhiGroupsControllerConfig>;

export const PhiGroupsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_GROUPS_RUNTIME_CONTROLLER_PLUGIN,
);
