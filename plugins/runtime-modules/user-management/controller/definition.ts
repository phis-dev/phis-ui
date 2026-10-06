import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import { PHI_USER_MANAGEMENT_CONTROLLER_KEY,
  PHI_USER_MANAGEMENT_CONTROLLER_PLUGIN_KEY } from "../controller/address";

/**
 * Whom the Controller answers into: the users Table, the three dialogs, the two Forms and their save
 * buttons, and the login history. The Page that holds them says so (`controllerSettings`).
 */
export type PhiUserManagementControllerConfig = {
  signalRoutes: PhiSignalRouteSet | null;
};

/*
 * Which workflow a signal belongs to is said by its channel, not by who sent it. The create and edit
 * dialogs are the same Overlay, Form and toolbar twice, and telling them apart by sender meant holding
 * every one of their Widget ids here -- so the Page routes each half on its own channel instead.
 */
const workflowListens = (["create", "edit"] as const).flatMap((workflow) => [
  {
    id: `${workflow}FormSuccess`,
    channel: `${workflow}Submit`,
    action: "activate" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
  },
  { id: `${workflow}Command`, channel: `${workflow}Command`, action: "activate" as const, valueType: "string" as const },
  { id: `${workflow}Submitting`, channel: `${workflow}Submitting`, action: "change" as const, valueType: "boolean" as const },
  {
    id: `${workflow}CloseRequest`,
    channel: `${workflow}Dialog`,
    action: "close" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
  },
]);

const workflowEmits = (["create", "edit"] as const).flatMap((workflow) => [
  { id: `${workflow}DialogClose`, action: "close" as const, valueType: "none" as const },
  { id: `${workflow}FormSubmit`, action: "activate" as const, valueType: "none" as const },
  { id: `${workflow}FormReset`, action: "activate" as const, valueType: "none" as const },
  { id: `${workflow}SaveSubmitting`, action: "change" as const, valueType: "boolean" as const },
  {
    id: `${workflow}DialogCondition`,
    action: "change" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
  },
]);

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
      { id: "createDialogOpen", action: "activate", valueType: "none" },
      { id: "editDialogOpen", action: "activate", valueType: "none" },
      { id: "historyDialogOpen", action: "activate", valueType: "none" },
      ...workflowEmits,
      {
        id: "editRecordOpen",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      {
        id: "editFormCondition",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
      {
        id: "historyFilters",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
      },
      { id: "usersReload", action: "activate", valueType: "none" },
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
      ...workflowListens,
      { id: "overlayState", channel: "state", action: "change", valueType: "boolean" },
      { id: "conditionStateRequest", channel: "condition", action: "reload", valueType: "none" },
    ],
  },
  defaultConfig: { signalRoutes: null },
  parseConfig: (raw: Record<string, unknown>): PhiUserManagementControllerConfig => ({
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiUserManagementControllerConfig>;
