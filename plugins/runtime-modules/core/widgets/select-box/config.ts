import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  buildPhiChoiceControlOptionFields,
  PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  parsePhiChoiceControlConfig,
  type PhiChoiceControlConfig,
} from "../../../../../components/widgets/config/choice-shared";
import { PHI_SELECT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";

export type PhiSelectBoxWidgetConfig = PhiChoiceControlConfig;

export function parsePhiSelectBoxWidgetConfig(config: Record<string, unknown>): PhiSelectBoxWidgetConfig {
  return parsePhiChoiceControlConfig(config);
}

export const PHI_SELECT_BOX_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("select-box"),
  typeKey: "select-box",
  title: "Select Box",
  description: "Reusable select control that emits runtime state signals.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: {
    ...PHI_SELECT_CONTROL_SIGNALS,
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "description", type: "string", label: "Description" },
    { key: "value", type: "string", label: "Value" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    {
      key: "presentation",
      type: "choice",
      label: "Presentation",
      options: [
        { value: "select", label: "Select" },
        { value: "autocomplete", label: "Autocomplete" },
      ],
    },
    { key: "allowCustom", type: "boolean", label: "Allow Custom Values" },
    ...buildPhiChoiceControlOptionFields("toolbar"),
    ...PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  ],
  defaultConfig: {
    key: "select",
    presentation: "select",
    optionsProvider: null,
    options: [],
  },
  parseConfig: parsePhiSelectBoxWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSelectBoxWidgetConfig>,
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
