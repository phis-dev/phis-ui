import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_ADMIN_CONTROLLER_KEY,
  PHI_ADMIN_CONTROLLER_PLUGIN_KEY } from "../controller/address";

export type PhiAdminControllerConfig = Record<string, never>;

export const PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_ADMIN_CONTROLLER_PLUGIN_KEY,
  key: PHI_ADMIN_CONTROLLER_KEY,
  title: "Admin Controller",
  description: "Area-base owner for the Admin shell, navigation surface, and Admin settings.",
  category: "admin",
  iconFamily: "admin",
  allowedMountScopes: ["area"],
  runtimeSignals: { emits: [], listens: [] },
  defaultConfig: {},
  parseConfig: (): PhiAdminControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiAdminControllerConfig>;
