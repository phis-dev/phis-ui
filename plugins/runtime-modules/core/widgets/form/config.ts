import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiTableSourceBinding } from "../../../../../types/table-widget";
import { isPhiFormId, normalizePhiFormId, type PhiFormId } from "../../../../../types/form-id";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import { requirePhiRuntimeFormControllerForWidget } from "../../../../../components/forms/runtime-form-controller-requirement";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../builder/ids";

export type PhiCmsFormWidgetConfig = {
  formId: PhiFormId | null;
  formConfig: Record<string, unknown>;
  execution: {
    mode: "handler" | "signal";
  };
  source: PhiTableSourceBinding | null;
  openActionKey?: string;
  signalRoutes: ReturnType<typeof readPhiSignalRouteSet>;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function parsePhiFormWidgetConfig(rawConfig: Record<string, unknown>): PhiCmsFormWidgetConfig {
  const normalizedFormId = typeof rawConfig.formId === "string"
    ? normalizePhiFormId(rawConfig.formId)
    : "";

  const execution = readRecord(rawConfig.execution);
  const source = readRecord(rawConfig.source);
  const providerKey = typeof source.providerKey === "string" ? source.providerKey : "";
  const resourceKey = typeof source.resourceKey === "string" ? source.resourceKey.trim() : "";

  return {
    formId: isPhiFormId(normalizedFormId) ? normalizedFormId : null,
    formConfig: readRecord(rawConfig.formConfig),
    execution: {
      mode: execution.mode === "signal" ? "signal" : "handler",
    },
    source: isPhiRuntimeDataProviderKey(providerKey) && resourceKey
      ? {
          providerKey,
          resourceKey,
          params: readRecord(source.params),
        }
      : null,
    openActionKey: typeof rawConfig.openActionKey === "string" && rawConfig.openActionKey.trim()
      ? rawConfig.openActionKey.trim()
      : undefined,
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

export const PHI_FORM_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("form"),
  typeKey: "form",
  title: "Form",
  category: "form",
  description: "Renders a Preset Form contributed by an active Runtime module.",
  iconFamily: "form",
  slotSizePolicy: "fill-inline",
  requiredRuntimeControllers: requirePhiRuntimeFormControllerForWidget,
  runtimeSignals: {
    emits: [
      { id: "submitSuccess", action: "activate", valueType: "none" },
      { id: "submitting", action: "change", valueType: "boolean" },
      {
        id: "submitError",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formError,
      },
      {
        id: "validationFailed",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity,
      },
      { id: "resetComplete", action: "activate", valueType: "none" },
      { id: "stateChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formState },
      {
        id: "submitValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      {
        id: "resetValues",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      { id: "command", action: "activate", valueType: "string" },
      { id: "cancel", action: "close", valueType: "none" },
      { id: "conditionStateRequest", action: "reload", valueType: "none" },
    ],
    listens: [
      { id: "submit", channel: "submit", action: "activate", valueType: "none" },
      { id: "reset", channel: "reset", action: "activate", valueType: "none" },
      {
        id: "recordOpen",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "close", channel: "dialog", action: "close", valueType: "none" },
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
      { id: "conditionStateChange", channel: "condition", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState },
    ],
  },
  fields: [
    {
      key: "formId",
      type: "choice",
      label: "Form",
      required: true,
      optionsProvider: {
        providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.forms,
      },
    },
    {
      key: "execution.mode",
      type: "choice",
      label: "Execution",
      options: [
        { value: "handler", label: "Submit handler" },
        { value: "signal", label: "Local signals" },
      ],
    },
    {
      key: "source",
      type: "data-provider",
      providerKind: "table",
      label: "Record source",
    },
    { key: "openActionKey", type: "string", label: "Open action key" },
  ],
  defaultConfig: {
    formId: null,
    formConfig: {},
    execution: { mode: "handler" },
    source: null,
    openActionKey: "edit",
    signalRoutes: null,
  },
  parseConfig: parsePhiFormWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsFormWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "requiredRuntimeControllers"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_FORM_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Form;
