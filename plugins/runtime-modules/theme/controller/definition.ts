import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import type { PhiControlOption } from "../../../../components/controls/phi-control-options";
import { PHI_THEME_CONTROLLER_KEY,
  PHI_THEME_CONTROLLER_PLUGIN_KEY } from "./address";
import { PHI_THEME_SIGNAL_CHANNELS } from "./signals";

/**
 * Whom the Controller states its history into: the undo and redo commands of the Page that shows them.
 * The Area runs this Controller; the Theme Page names its toolbar while it is shown (`controllerSettings`),
 * and anywhere else the history is kept and told to nobody.
 */
export type PhiThemeRuntimeControllerConfig = {
  signalRoutes: PhiSignalRouteSet | null;
};

/**
 * The Sets this Site offers, worked out on the server where the installed Modules are known.
 *
 * The Controller restates the Set select's options whenever the stored Theme changes, and it replaces
 * the whole list, so it is the same list the Page tree drew (set-options.ts): a Theme is site-wide, and
 * the Sets are read from what is installed, not from what this Area switched on.
 */
export type PhiThemeRuntimeControllerPreload = {
  setOptions: PhiControlOption[];
};

export function parsePhiThemeRuntimeControllerConfig(raw: Record<string, unknown>): PhiThemeRuntimeControllerConfig {
  return { signalRoutes: readPhiSignalRouteSet(raw.signalRoutes) };
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
        id: "presetOptions",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.controlOptions,
      },
      { id: "undoEnabled", action: "change", valueType: "boolean" },
      { id: "redoEnabled", action: "change", valueType: "boolean" },
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
      // A Draft Status Widget asking, on mount, for the state; answered to it alone.
      {
        id: "draftStatus",
        channel: PHI_THEME_SIGNAL_CHANNELS.draftStatus,
        action: "activate",
        valueType: "none",
      },
    ],
  },
  defaultConfig: {},
  parseConfig: parsePhiThemeRuntimeControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiThemeRuntimeControllerConfig, PhiThemeRuntimeControllerPreload>;
