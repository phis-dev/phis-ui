import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_NEWS_CONTROLLER_KEY, PHI_NEWS_CONTROLLER_PLUGIN_KEY } from "./address";

export type PhiNewsControllerConfig = Record<string, never>;

/**
 * What a generic Table cannot say: that the row somebody pressed is a news entry.
 *
 * A Table reports that an action was activated on a row; only this Module knows that `edit` means the entry
 * Form and `publish` means the publication Form, which dialog each belongs to, and that a saved Form means
 * the list is stale. Mounted on demand rather than for the Area: it exists for one Page, and the Public
 * News list needs nothing of it.
 */
export const PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_NEWS_CONTROLLER_PLUGIN_KEY,
  key: PHI_NEWS_CONTROLLER_KEY,
  title: "News Controller",
  description: "Module owner for writing and publishing news entries.",
  icon: "antd:notification",
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      { id: "dialogOpen", action: "activate", valueType: "none" },
      { id: "dialogClose", action: "close", valueType: "none" },
      { id: "formSubmit", action: "activate", valueType: "none" },
      { id: "formReset", action: "activate", valueType: "none" },
      { id: "reload", action: "activate", valueType: "none" },
      { id: "submitting", action: "change", valueType: "boolean" },
      {
        id: "recordOpen",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
    ],
    listens: [
      {
        id: "tableAction",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "command", channel: "command", action: "activate", valueType: "string" },
      { id: "formSuccess", channel: "submit", action: "activate", valueType: "none" },
      { id: "formSubmitting", channel: "submitting", action: "change", valueType: "boolean" },
      {
        id: "overlayCloseRequest",
        channel: "dialog",
        action: "close",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
      },
      { id: "overlayState", channel: "state", action: "change", valueType: "boolean" },
    ],
  },
  defaultConfig: {},
  parseConfig: () => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiNewsControllerConfig>;
