import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_MULTI_SELECT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { PHI_CONTROL_STATE_FIELDS, parsePhiControlStateConfig } from "../../../../../components/widgets/config/control-signal-config";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import {
  buildPhiChoiceControlOptionFields,
  parsePhiChoiceOptionsConfig,
  type PhiChoiceOptionsConfig,
} from "../../../../../components/widgets/config/choice-shared";

export type PhiCheckboxGroupWidgetConfig = PhiChoiceOptionsConfig & {
  label?: string;
  value?: string[];
  vertical?: boolean;
  signalRoutes?: ReturnType<typeof parsePhiControlStateConfig>["signalRoutes"];
  key?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function parsePhiCheckboxGroupWidgetConfig(config: Record<string, unknown>): PhiCheckboxGroupWidgetConfig {
  return {
    ...parsePhiControlStateConfig(config, { key: "checkbox-group" }),
    label: readString(config.label),
    value: Array.isArray(config.value)
      ? config.value.map((entry) => readString(entry)).filter((entry): entry is string => Boolean(entry))
      : undefined,
    ...parsePhiChoiceOptionsConfig(config),
    vertical: readBoolean(config.vertical) ?? false,
  };
}

export const PHI_CHECKBOX_GROUP_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("checkbox-group"),
  typeKey: "checkbox-group",
  title: "Checkbox Group",
  description: "Reusable multi-choice checkbox group with static or provider-backed options.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: { ...PHI_MULTI_SELECT_CONTROL_SIGNALS },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "string", label: "Value" },
    ...buildPhiChoiceControlOptionFields("toolbar"),
    { key: "vertical", type: "boolean", label: "Vertical" },
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "checkbox-group",
    optionsProvider: null,
    options: [],
    vertical: false,
  },
  parseConfig: parsePhiCheckboxGroupWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCheckboxGroupWidgetConfig>,
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

export const PHI_CHECKBOX_GROUP_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.CheckboxGroup;
