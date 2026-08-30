import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiSignalValueType } from "../../../../../types/signals";
import {
  PHI_MULTI_SELECT_CONTROL_SIGNALS,
} from "../../../../../components/widgets/signals/control-signal-capabilities";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import {
  buildPhiChoiceControlOptionFields,
  parsePhiChoiceOptionsConfig,
  type PhiChoiceOptionsConfig,
} from "../../../../../components/widgets/config/choice-shared";

export type PhiMultiSelectWidgetValueType = Extract<PhiSignalValueType, "enum[]" | "string[]" | "number[]">;

export type PhiMultiSelectWidgetConfig = PhiControlConfig & PhiChoiceOptionsConfig & {
  label?: string;
  description?: string;
  value?: string[] | number[];
  placeholder?: string;
  valueType?: PhiMultiSelectWidgetValueType;
  maxTagCount?: number | "responsive";
  allowCustom?: boolean;
};

function readMultiSelectValueType(value: unknown): PhiMultiSelectWidgetValueType {
  return value === "number[]" || value === "string[]" ? value : "enum[]";
}

function readMultiSelectValue(value: unknown, valueType: PhiMultiSelectWidgetValueType): string[] | number[] | undefined {
  if (!Array.isArray(value)) {
    const scalar = readString(value);
    if (!scalar) {
      return undefined;
    }
    const parts = scalar
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (valueType !== "number[]") {
      return parts;
    }
    const numbers = parts
      .map((part) => Number(part))
      .filter((part) => Number.isFinite(part) && Number.isInteger(part));
    return numbers.length > 0 ? numbers : undefined;
  }

  if (valueType !== "number[]") {
    return value
      .map((entry) => readString(entry))
      .filter((entry): entry is string => entry != null && entry.length > 0);
  }

  return value
    .map((entry) => (typeof entry === "number" ? entry : Number(readString(entry))))
    .filter((entry) => Number.isFinite(entry) && Number.isInteger(entry));
}

function readMaxTagCount(value: unknown): number | "responsive" | undefined {
  if (value === "responsive") {
    return "responsive";
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(value));
}

export function parsePhiMultiSelectWidgetConfig(config: Record<string, unknown>): PhiMultiSelectWidgetConfig {
  const valueType = readMultiSelectValueType(config.valueType);
  const controlState = parsePhiControlConfig(config, {
    key: "multi-select",
  });

  return {
    ...controlState,
    label: readString(config.label),
    description: readString(config.description),
    value: readMultiSelectValue(config.value, valueType),
    placeholder: readString(config.placeholder),
    valueType,
    maxTagCount: readMaxTagCount(config.maxTagCount),
    allowCustom: readBoolean(config.allowCustom),
    ...parsePhiChoiceOptionsConfig(config),
  };
}

export const PHI_MULTI_SELECT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("multi-select"),
  typeKey: "multi-select",
  title: "Multi Select",
  description: "Reusable multi-select control that emits runtime selection signals.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: {
    emits: [
      ...(PHI_MULTI_SELECT_CONTROL_SIGNALS.emits ?? []),
      { id: "changeString", action: "change", valueType: "string[]" },
      { id: "changeNumber", action: "change", valueType: "number[]" },
    ],
    listens: [
      ...(PHI_MULTI_SELECT_CONTROL_SIGNALS.listens ?? []),
      { id: "selectionString", channel: "selection", action: "change", valueType: "string[]" },
      { id: "selectionNumber", channel: "selection", action: "change", valueType: "number[]" },
    ],
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "description", type: "string", label: "Description" },
    { key: "value", type: "string", label: "Value" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    {
      key: "valueType",
      type: "choice",
      label: "Value Type",
      options: [
        { value: "enum[]", label: "Enum Array" },
        { value: "string[]", label: "String Array" },
        { value: "number[]", label: "Number Array" },
      ],
    },
    ...buildPhiChoiceControlOptionFields("toolbar"),
    { key: "maxTagCount", type: "string", label: "Max Tag Count" },
    { key: "allowCustom", type: "boolean", label: "Allow Custom Values" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "multi-select",
    valueType: "enum[]",
    optionsProvider: null,
    options: [],
  },
  parseConfig: parsePhiMultiSelectWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiMultiSelectWidgetConfig>,
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

export const PHI_MULTI_SELECT_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.MultiSelect;
