import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { PHI_TEXT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import type { PhiTextInputType } from "../../../../../components/controls/phi-text-types";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

export type PhiCmsInputWidgetInputType = PhiTextInputType;

export type PhiCmsInputWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  text?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  inputType?: PhiCmsInputWidgetInputType;
  allowClear?: boolean;
  debounceMs?: number;
  minValueLength?: number;
  trimEmittedValue?: boolean;
  submitOnEnter?: boolean;
};

export function parsePhiCmsInputWidgetConfig(config: Record<string, unknown>): PhiCmsInputWidgetConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "input",
  });

  return {
    ...readRenderableBlockConfig(config),
    ...controlState,
    text: readString(config.text),
    label: readString(config.label),
    description: readString(config.description),
    placeholder: readString(config.placeholder),
    inputType: ((): PhiCmsInputWidgetInputType => {
      const inputType = readString(config.inputType);
      return inputType === "text" ||
        inputType === "url" ||
        inputType === "phone" ||
        inputType === "email" ||
        inputType === "password" ||
        inputType === "search"
        ? inputType
        : "text";
    })(),
    allowClear: readBoolean(config.allowClear) ?? true,
    debounceMs: typeof config.debounceMs === "number" && config.debounceMs >= 0 ? config.debounceMs : 0,
    minValueLength: typeof config.minValueLength === "number" && config.minValueLength >= 0 ? config.minValueLength : 0,
    trimEmittedValue: readBoolean(config.trimEmittedValue) ?? false,
    submitOnEnter: readBoolean(config.submitOnEnter) ?? true,
  };
}

export const PHI_INPUT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("input"),
  typeKey: "input",
  title: "Input",
  description: "Simple text input control that dispatches text commands for its own block.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: {
    ...PHI_TEXT_CONTROL_SIGNALS,
  },
  fields: [
    { key: "text", type: "string", label: "Text" },
    { key: "label", type: "string", label: "Label" },
    { key: "description", type: "string", label: "Description" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    {
      key: "inputType",
      type: "choice",
      label: "Input Type",
      options: [
        { value: "text", label: "Text" },
        { value: "url", label: "URL" },
        { value: "phone", label: "Phone" },
        { value: "email", label: "Email" },
        { value: "password", label: "Password" },
        { value: "search", label: "Search" },
      ],
    },
    { key: "allowClear", type: "boolean", label: "Allow Clear" },
    { key: "debounceMs", type: "number", label: "Change Debounce Ms", min: 0, precision: 0 },
    { key: "minValueLength", type: "number", label: "Minimum Emitted Length", min: 0, precision: 0 },
    { key: "trimEmittedValue", type: "boolean", label: "Trim Emitted Value" },
    { key: "submitOnEnter", type: "boolean", label: "Submit On Enter" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    text: "",
    inputType: "text",
    allowClear: true,
    debounceMs: 0,
    minValueLength: 0,
    trimEmittedValue: false,
    submitOnEnter: true,
    key: "input",
  },
  parseConfig: parsePhiCmsInputWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsInputWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"

  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_INPUT_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Input;
