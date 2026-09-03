import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_EDITOR_CONTROLLER_KEY,
  PHI_EDITOR_CONTROLLER_PLUGIN_KEY } from "./address";

export type PhiEditorControllerConfig = Record<string, never>;

export const PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_EDITOR_CONTROLLER_PLUGIN_KEY,
  key: PHI_EDITOR_CONTROLLER_KEY,
  title: "Editor Controller",
  description: "Module owner for content authoring functionality.",
  iconFamily: "editor",
  allowedMountScopes: ["area"],
  runtimeSignals: { emits: [], listens: [] },
  defaultConfig: {},
  parseConfig: (): PhiEditorControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiEditorControllerConfig>;
