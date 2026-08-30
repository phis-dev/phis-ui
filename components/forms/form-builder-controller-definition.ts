import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import { PHI_FORM_BUILDER_CONTROLLER_KEY,
  PHI_FORM_BUILDER_CONTROLLER_PLUGIN_KEY } from "./form-builder-controller-address";

export type PhiFormBuilderControllerConfig = Record<string, never>;

export function parsePhiFormBuilderControllerConfig(): PhiFormBuilderControllerConfig {
  return {};
}

export const PHI_FORM_BUILDER_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_FORM_BUILDER_CONTROLLER_PLUGIN_KEY,
  key: PHI_FORM_BUILDER_CONTROLLER_KEY,
  title: "Form Builder Controller",
  description: "Client-only controller lifecycle for authoring form definitions.",
  category: "forms",
  iconFamily: "forms",
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [],
    listens: [],
  },
  defaultConfig: {},
  parseConfig: parsePhiFormBuilderControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiFormBuilderControllerConfig>;
