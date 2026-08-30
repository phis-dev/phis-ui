import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_BOOLEAN_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { PHI_CONTROL_STATE_FIELDS, parsePhiControlStateConfig } from "../../../../../components/widgets/config/control-signal-config";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCheckboxWidgetConfig = ReturnType<typeof parsePhiCheckboxWidgetConfig>;

export function parsePhiCheckboxWidgetConfig(config: Record<string, unknown>) {
  return {
    ...parsePhiControlStateConfig(config, { key: "checkbox" }),
    label: readString(config.label),
    checked: readBoolean(config.checked) ?? false,
    indeterminate: readBoolean(config.indeterminate) ?? false,
  };
}

export const PHI_CHECKBOX_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("checkbox"),
  typeKey: "checkbox",
  title: "Checkbox",
  description: "Reusable boolean checkbox that emits typed state signals.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: { ...PHI_BOOLEAN_CONTROL_SIGNALS },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "checked", type: "boolean", label: "Checked" },
    { key: "indeterminate", type: "boolean", label: "Indeterminate" },
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "checkbox",
    checked: false,
    indeterminate: false,
  },
  parseConfig: parsePhiCheckboxWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCheckboxWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_CHECKBOX_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Checkbox;
