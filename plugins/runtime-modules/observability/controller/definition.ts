import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import {
  PHI_OBSERVABILITY_CONTROLLER_KEY,
  PHI_OBSERVABILITY_CONTROLLER_PLUGIN_KEY,
} from "../controller/address";

export type PhiObservabilityControllerConfig = {
  openActionKey: string;
};

export function parsePhiObservabilityControllerConfig(
  rawConfig: Record<string, unknown>,
): PhiObservabilityControllerConfig {
  return {
    openActionKey: typeof rawConfig.openActionKey === "string" && rawConfig.openActionKey.trim()
      ? rawConfig.openActionKey.trim()
      : "view",
  };
}

export const PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_OBSERVABILITY_CONTROLLER_PLUGIN_KEY,
  key: PHI_OBSERVABILITY_CONTROLLER_KEY,
  title: "Observability Controller",
  description: "Owns transient Page state for Observability detail workflows.",
  category: "observability",
  iconFamily: "observability",
  allowedMountScopes: ["page"],
  runtimeSignals: {
    emits: [],
    listens: [{
      id: "recordSelect",
      channel: "action",
      action: "activate",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
    }, {
      id: "overlayOpenChange",
      channel: "state",
      action: "change",
      valueType: "boolean",
    }],
  },
  defaultConfig: { openActionKey: "view" },
  parseConfig: parsePhiObservabilityControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiObservabilityControllerConfig>;
