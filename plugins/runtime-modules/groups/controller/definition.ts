import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_GROUPS_CONTROLLER_KEY,
  PHI_GROUPS_CONTROLLER_PLUGIN_KEY } from "../controller/address";

export type PhiGroupsControllerConfig = {
  /**
   * Who this Controller speaks to, written by the Page that placed it.
   *
   * It used to hold the Widget ids of both Groups Pages at once and send to all of them, on the
   * grounds that a signal to an address nobody listens on is not delivered. That worked and hid the
   * real problem: the Controller knew there were two Pages, and neither Page could be rearranged.
   * Each Page names its own receivers now, and the Controller has stopped counting Pages.
   */
  signalRoutes: PhiSignalRouteSet | null;
};

/**
 * Turns "a group is selected" into "show that group's members".
 *
 * The two tables speak different vocabularies -- a table reports a selection and accepts filters -- so
 * something has to translate between them. That is all this Controller does; who may change a
 * membership is settled by the control plane, not here.
 */
export const PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_GROUPS_CONTROLLER_PLUGIN_KEY,
  key: PHI_GROUPS_CONTROLLER_KEY,
  title: "Groups Controller",
  description: "Carries the selected group from the group table to the membership table.",
  iconFamily: "groups",
  allowedMountScopes: ["page"],
  runtimeSignals: {
    emits: [
      {
        id: "filtersChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
      },
      {
        id: "conditionStateChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
      { id: "reload", action: "activate", valueType: "none" },
      /*
       * Two submits, because they are two Forms and the toolbar asks for one of them by name. It was
       * one output aimed by a value -- `save` against `saveMembership` -- which put the choice of
       * receiver in the payload, where a route could not see it.
       */
      { id: "createSubmit", action: "activate", valueType: "none" },
      { id: "membershipSubmit", action: "activate", valueType: "none" },
    ],
    listens: [
      {
        id: "selectionChange",
        channel: "selection",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableSelection,
      },
      // A Widget asking for the condition state is also what declares it needs this Controller, which
      // is how a `demand` Controller comes to be mounted at all.
      { id: "conditionStateRequest", channel: "condition", action: "reload", valueType: "none" },
      {
        id: "formSuccess",
        channel: "submit",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      },
      { id: "formCommand", channel: "command", action: "activate", valueType: "string" },
    ],
  },
  defaultConfig: {},
  parseConfig: (raw): PhiGroupsControllerConfig => ({
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiGroupsControllerConfig>;
