import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { PHI_USER_MANAGEMENT_CONTROLLER_KEY,
  PHI_USER_MANAGEMENT_CONTROLLER_PLUGIN_KEY } from "../controller/address";

export type PhiUserManagementControllerConfig = Record<string, never>;

export const PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_USER_MANAGEMENT_CONTROLLER_PLUGIN_KEY,
  key: PHI_USER_MANAGEMENT_CONTROLLER_KEY,
  title: "User Management Controller",
  description: "Owns Page-scoped user-management workflow selection and presentation permissions.",
  iconFamily: "user-management",
  allowedMountScopes: ["page"],
  runtimeSignals: {
    emits: [
      { id: "dialogOpen", action: "activate", valueType: "none" },
      { id: "dialogClose", action: "close", valueType: "none" },
      {
        id: "recordOpen",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      {
        id: "filtersChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
      },
      { id: "reload", action: "activate", valueType: "none" },
      { id: "formSubmit", action: "activate", valueType: "none" },
      { id: "formReset", action: "activate", valueType: "none" },
      {
        id: "conditionStateChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
    ],
    listens: [
      {
        id: "tableAction",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "formSuccess", channel: "submit", action: "activate", valueType: "none" },
      { id: "formCommand", channel: "command", action: "activate", valueType: "string" },
      { id: "formSubmitting", channel: "submitting", action: "change", valueType: "boolean" },
      {
        id: "overlayCloseRequest",
        channel: "dialog",
        action: "close",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
      },
      { id: "overlayState", channel: "state", action: "change", valueType: "boolean" },
      { id: "conditionStateRequest", channel: "condition", action: "reload", valueType: "none" },
    ],
  },
  defaultConfig: {},
  parseConfig: (): PhiUserManagementControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiUserManagementControllerConfig>;
