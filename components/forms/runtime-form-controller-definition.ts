import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import { PHI_FORM_CONTROLLER_PLUGIN_KEY } from "./runtime-form-controller-address";
import {
  PHI_FORM_CONTROLLER_KEY,
  PHI_RUNTIME_FORM_CONTROLLER_EMITS,
  PHI_RUNTIME_FORM_CONTROLLER_LISTENS,
} from "./runtime-form-controller-signals";

export type PhiRuntimeFormControllerConfig = Record<string, never>;

export function parsePhiRuntimeFormControllerConfig(): PhiRuntimeFormControllerConfig {
  return {};
}

export const PHI_RUNTIME_FORM_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_FORM_CONTROLLER_PLUGIN_KEY,
  key: PHI_FORM_CONTROLLER_KEY,
  title: "Form Controller",
  description: "Headless multi-instance controller for runtime form state, submit, confirm, reset, clear, result, and error signaling.",
  category: "forms",
  iconFamily: "forms",
  flags: ["multiInstance"],
  allowedMountScopes: ["site", "area", "page"],
  runtimeSignals: {
    emits: [...PHI_RUNTIME_FORM_CONTROLLER_EMITS],
    listens: [...PHI_RUNTIME_FORM_CONTROLLER_LISTENS],
  },
  defaultConfig: {},
  parseConfig: parsePhiRuntimeFormControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiRuntimeFormControllerConfig>;
