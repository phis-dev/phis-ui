import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_DASHBOARD_CONTROLLER_KEY,
  PHI_DASHBOARD_CONTROLLER_PLUGIN_KEY } from "./address";

export type PhiDashboardControllerConfig = Record<string, never>;

export const PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_DASHBOARD_CONTROLLER_PLUGIN_KEY,
  key: PHI_DASHBOARD_CONTROLLER_KEY,
  title: "Dashboard Controller",
  description: "Module owner for Area-specific Dashboard routes and future Dashboard projections.",
  category: "dashboard",
  iconFamily: "dashboard",
  allowedMountScopes: ["area"],
  runtimeSignals: { emits: [], listens: [] },
  defaultConfig: {},
  parseConfig: (): PhiDashboardControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiDashboardControllerConfig>;
