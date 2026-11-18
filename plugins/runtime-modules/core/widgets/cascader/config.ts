import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import type { PhiCascaderNormalizeMode, PhiCascaderOption, PhiCascaderSelect } from "../../../../../components/controls/phi-cascader-control";
import { PHI_PATH_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
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

export type PhiCascaderWidgetConfig = PhiControlConfig & PhiChoiceOptionsConfig & {
  label?: string;
  value?: string;
  placeholder?: string;
  allowRoot?: boolean;
  separator?: string;
  rootValue?: string;
  normalize?: PhiCascaderNormalizeMode;
  /** How a level opens: on a click (the default) or under the pointer. */
  expandTrigger: "click" | "hover";
  /** What a click may choose: every level, or only a value the options name (`PhiCascaderControl`). */
  select: PhiCascaderSelect;
  options: PhiCascaderOption[];
};

function readNormalizeMode(value: unknown): PhiCascaderNormalizeMode {
  return readString(value) === "path" ? "path" : "raw";
}

function parsePhiCascaderWidgetConfig(
  config: Record<string, unknown>,
): PhiCascaderWidgetConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "cascader",
  });

  return {
    ...controlState,
    label: readString(config.label),
    value: readString(config.value),
    placeholder: readString(config.placeholder),
    allowRoot: readBoolean(config.allowRoot) ?? true,
    separator: readString(config.separator) ?? "/",
    rootValue: readString(config.rootValue) ?? "/",
    normalize: readNormalizeMode(config.normalize),
    expandTrigger: readString(config.expandTrigger) === "hover" ? "hover" : "click",
    select: readString(config.select) === "options" ? "options" : "any",
    ...parsePhiChoiceOptionsConfig(config),
  };
}

export const PHI_CASCADER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("cascader"),
  typeKey: "cascader",
  slotSizePolicy: "intrinsic",
  title: "Cascader",
  description: "Reusable writable cascader that emits runtime state signals.",
  category: "form",
  iconFamily: "form",
  runtimeSignals: {
    ...PHI_PATH_CONTROL_SIGNALS,
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "string", label: "Value" },
    { key: "placeholder", type: "string", label: "Placeholder" },
    ...buildPhiChoiceControlOptionFields("toolbar"),
    { key: "allowRoot", type: "boolean", label: "Allow Root" },
    { key: "separator", type: "string", label: "Separator character" },
    { key: "rootValue", type: "string", label: "Root Value" },
    {
      key: "normalize",
      type: "choice",
      label: "Normalize",
      options: [
        { value: "raw", label: "Raw" },
        { value: "path", label: "Path" },
      ],
    },
    {
      key: "expandTrigger",
      type: "choice",
      label: "Opens",
      options: [
        { value: "click", label: "On click" },
        { value: "hover", label: "On hover" },
      ],
    },
    {
      key: "select",
      type: "choice",
      label: "Choosable",
      options: [
        { value: "any", label: "Every level" },
        { value: "options", label: "Only the options" },
      ],
    },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "cascader",
    allowRoot: true,
    separator: "/",
    rootValue: "/",
    normalize: "raw",
    expandTrigger: "click",
    select: "any",
    optionsProvider: null,
    options: [],
  },
  parseConfig: parsePhiCascaderWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCascaderWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
