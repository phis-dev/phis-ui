import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import {
  PHI_ACCOUNTING_BASE_CONTROLLER_KEY,
  PHI_ACCOUNTING_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_APP_BASE_CONTROLLER_KEY,
  PHI_APP_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_AUTH_CONTROLLER_KEY,
  PHI_AUTH_CONTROLLER_PLUGIN_KEY,
  PHI_PUBLIC_BASE_CONTROLLER_KEY,
  PHI_PUBLIC_BASE_CONTROLLER_PLUGIN_KEY,
} from "./area-base-controller-addresses";

type PhiEmptyControllerConfig = Record<string, never>;

function createPhiEmptyControllerDefinition(
  pluginKey: string,
  key: string,
  title: string,
  iconFamily: string,
  areaBase = true,
) {
  return {
    kind: "controller",
    pluginKey,
    key,
    title,
    description: areaBase
      ? `Locked Area controller for ${title}.`
      : `Runtime module controller for ${title}.`,
    iconFamily,
    allowedMountScopes: ["area"],
    runtimeSignals: { emits: [], listens: [] },
    defaultConfig: {},
    parseConfig: (): PhiEmptyControllerConfig => ({}),
  } satisfies PhiRuntimeControllerDefinition<PhiEmptyControllerConfig>;
}

export const PHI_PUBLIC_BASE_CONTROLLER_DEFINITION = createPhiEmptyControllerDefinition(
  PHI_PUBLIC_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_PUBLIC_BASE_CONTROLLER_KEY, "Public Base Controller", "public",
);
export const PHI_APP_BASE_CONTROLLER_DEFINITION = createPhiEmptyControllerDefinition(
  PHI_APP_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_APP_BASE_CONTROLLER_KEY, "App Base Controller", "app",
);
export const PHI_AUTH_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_AUTH_CONTROLLER_PLUGIN_KEY,
  key: PHI_AUTH_CONTROLLER_KEY,
  title: "Auth Controller",
  description: "Coordinates the active Auth UI provider modal and workflow presentation state.",
  iconFamily: "auth",
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      { id: "loginOverlayOpen", action: "activate", valueType: "none" },
      { id: "loginOverlayClose", action: "close", valueType: "none" },
      {
        id: "loginValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
    ],
    listens: [
      { id: "loginOpen", channel: "command", action: "open", valueType: "path" },
      { id: "loginClose", channel: "command", action: "close", valueType: "none" },
      {
        id: "loginOverlayCloseRequest",
        channel: "dialog",
        action: "close",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
      },
    ],
  },
  defaultConfig: {},
  parseConfig: (): PhiEmptyControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiEmptyControllerConfig>;
export const PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION = createPhiEmptyControllerDefinition(
  PHI_ACCOUNTING_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_ACCOUNTING_BASE_CONTROLLER_KEY, "Accounting Base Controller", "accounting",
);
