import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_LOCALIZATION_CONTROLLER_KEY,
  PHI_LOCALIZATION_CONTROLLER_PLUGIN_KEY } from "../controller/address";

export type PhiLocalizationControllerConfig = {
  /**
   * Who this Controller speaks to, written by the Page that mounts it: the edit Overlay, its Form, the
   * save button, the source-locale field and the Table. It used to name those Widgets itself, so the
   * Page could not be rearranged without the Controller going quiet (SIGNALS.md, "Button address").
   */
  signalRoutes: PhiSignalRouteSet | null;
};

export const PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_LOCALIZATION_CONTROLLER_PLUGIN_KEY,
  key: PHI_LOCALIZATION_CONTROLLER_KEY,
  title: "Localization Controller",
  description: "Module owner for locale and translation administration.",
  iconFamily: "localization",
  allowedMountScopes: ["page"],
  runtimeSignals: {
    emits: [
      {
        id: "workspace",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.localizationWorkspace,
      },
      {
        id: "filters",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableFilters,
      },
      { id: "searchClear", action: "clear", valueType: "none" },
      { id: "reload", action: "activate", valueType: "none" },
      { id: "dialogOpen", action: "activate", valueType: "none" },
      { id: "dialogClose", action: "close", valueType: "none" },
      { id: "formSubmit", action: "activate", valueType: "none" },
      { id: "formReset", action: "activate", valueType: "none" },
      { id: "recordOpen", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction },
      { id: "targetSelection", action: "change", valueType: "string" },
      { id: "contextSelection", action: "change", valueType: "string" },
      { id: "statusSelection", action: "change", valueType: "string" },
      { id: "sourceLocale", action: "change", valueType: "string" },
      { id: "saveSubmitting", action: "change", valueType: "boolean" },
    ],
    listens: [
      { id: "locale", channel: "locale", action: "change", valueType: "string" },
      { id: "context", channel: "context", action: "change", valueType: "string" },
      { id: "contextClear", channel: "context", action: "clear", valueType: "none" },
      { id: "status", channel: "status", action: "change", valueType: "string" },
      { id: "reset", channel: "query", action: "clear", valueType: "none" },
      { id: "command", channel: "command", action: "activate", valueType: "string" },
      { id: "tableQuery", channel: "query", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableQuery },
      { id: "tableAction", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction },
      {
        id: "formSuccess",
        channel: "submit",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      },
      { id: "formSubmitting", channel: "submitting", action: "change", valueType: "boolean" },
      { id: "overlayCloseRequest", channel: "dialog", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest },
      { id: "overlayState", channel: "state", action: "change", valueType: "boolean" },
      {
        id: "tableControlsChange",
        channel: "tableControls",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      {
        id: "tableControlsReset",
        channel: "tableControls",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      {
        id: "workspace",
        channel: "localizationWorkspace",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.localizationWorkspace,
      },
    ],
  },
  defaultConfig: { signalRoutes: null },
  parseConfig: (raw): PhiLocalizationControllerConfig => ({
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiLocalizationControllerConfig>;
