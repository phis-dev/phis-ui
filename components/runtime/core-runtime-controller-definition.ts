import {
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import { PHI_CORE_RUNTIME_CONTROLLER_KEY,
  PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY } from "./core-runtime-controller-address";

export type PhiCoreRuntimeControllerConfig = Record<string, never>;

export const PHI_CORE_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY,
  key: PHI_CORE_RUNTIME_CONTROLLER_KEY,
  title: "Runtime Controller",
  description: "Required controller and module owner for the generic Phi CMS runtime.",
  category: "runtime",
  iconFamily: "runtime",
  allowedMountScopes: ["site"],
  runtimeSignals: {
    emits: [
      {
        id: "pageMeta",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pageMeta,
      },
      { id: "pageTitle", action: "change", valueType: "string" },
      { id: "pageDescription", action: "change", valueType: "string" },
      { id: "pageDescriptionClear", action: "clear", valueType: "none" },
      { id: "openGraphImage", action: "change", valueType: "image" },
      { id: "openGraphImageClear", action: "clear", valueType: "none" },
      { id: "canonicalUrl", action: "change", valueType: "string" },
      { id: "canonicalUrlClear", action: "clear", valueType: "none" },
      {
        id: "theme",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
      },
      { id: "locale", action: "change", valueType: "string" },
    ],
    listens: [
      { id: "pageTitle", channel: "pageTitle", action: "change", valueType: "string" },
      { id: "pageDescription", channel: "pageDescription", action: "change", valueType: "string" },
      { id: "pageDescriptionClear", channel: "pageDescription", action: "clear", valueType: "none" },
      { id: "openGraphImage", channel: "openGraphImage", action: "change", valueType: "image" },
      { id: "openGraphImageClear", channel: "openGraphImage", action: "clear", valueType: "none" },
      { id: "canonicalUrl", channel: "canonicalUrl", action: "change", valueType: "string" },
      { id: "canonicalUrlClear", channel: "canonicalUrl", action: "clear", valueType: "none" },
      {
        id: "theme",
        channel: "theme",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
      },
      { id: "themeMode", channel: "themeMode", action: "change", valueType: "boolean" },
      { id: "locale", channel: "locale", action: "change", valueType: "string" },
      {
        id: "notification",
        channel: "notification",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.notification,
      },
      {
        id: "message",
        channel: "message",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.message,
      },
    ],
  },
  defaultConfig: {},
  parseConfig: (): PhiCoreRuntimeControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiCoreRuntimeControllerConfig>;
