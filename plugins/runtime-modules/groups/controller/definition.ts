import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_GROUPS_CONTROLLER_KEY,
  PHI_GROUPS_CONTROLLER_PLUGIN_KEY } from "../controller/address";

export type PhiGroupsControllerConfig = Record<string, never>;

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
  category: "groups",
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
      { id: "formSubmit", action: "activate", valueType: "none" },
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
      { id: "formSuccess", channel: "submit", action: "activate", valueType: "none" },
      { id: "formCommand", channel: "command", action: "activate", valueType: "string" },
    ],
  },
  defaultConfig: {},
  parseConfig: (): PhiGroupsControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiGroupsControllerConfig>;
