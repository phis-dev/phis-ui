import {
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_THEME_CONTROLLER_KEY,
  PHI_THEME_CONTROLLER_PLUGIN_KEY } from "./address";
import { PHI_THEME_SIGNAL_CHANNELS } from "./signals";

export type PhiThemeRuntimeControllerConfig = Record<string, never>;

export function parsePhiThemeRuntimeControllerConfig(): PhiThemeRuntimeControllerConfig {
  return {};
}

export const PHI_THEME_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_THEME_CONTROLLER_PLUGIN_KEY,
  key: PHI_THEME_CONTROLLER_KEY,
  title: "Theme Controller",
  description: "Headless controller for builder brand theme drafts, preview mode, revision state, and theme commands.",
  iconFamily: "theme",
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      {
        id: "brandTheme",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
      },
      {
        id: "draftStatus",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      },
      {
        id: "presetSelection",
        action: "change",
        valueType: "string",
      },
      {
        id: "commandEnabled",
        action: "change",
        valueType: "boolean",
      },
    ],
    listens: [
      {
        id: "brandTheme",
        channel: PHI_THEME_SIGNAL_CHANNELS.brandTheme,
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
      },
      {
        id: "previewThemeMode",
        channel: PHI_THEME_SIGNAL_CHANNELS.previewThemeMode,
        action: "change",
        valueType: "boolean",
      },
      {
        id: "presetSelect",
        channel: PHI_THEME_SIGNAL_CHANNELS.presetSelect,
        action: "change",
        valueType: "string",
      },
      {
        id: "command",
        channel: PHI_THEME_SIGNAL_CHANNELS.command,
        action: "activate",
        valueType: "string",
      },
    ],
  },
  defaultConfig: {},
  parseConfig: parsePhiThemeRuntimeControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiThemeRuntimeControllerConfig>;
