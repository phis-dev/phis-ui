import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_CHOICE_CONTROL_OPTION_FIELDS,
  PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
  parsePhiStackChoiceControlConfig,
  type PhiStackChoiceControlConfig,
} from "../../../../../components/widgets/config/choice-shared";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import { PHI_SELECT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";

/**
 * Steps are a choice drawn as a sequence.
 *
 * Each step is an option -- its value the step's key, its label the title, its description the line
 * under it -- and the step in progress is the chosen value. That makes the Stack coupling the one the
 * Segmented already has: with Value Mode "Stack Slot Index" the steps are the followed Stack's slots and
 * follow its active slot, and a step pressed activates its slot. A wizard is a Stack with Steps above it.
 */
export type PhiStepsWidgetConfig = Omit<PhiStackChoiceControlConfig, "presentation"> & {
  orientation?: "horizontal" | "vertical";
  stepMarker?: "number" | "dot";
  /** Whether a step can be pressed to go to it. Off, the steps only show where the sequence stands. */
  navigable?: boolean;
};

function parsePhiStepsWidgetConfig(config: Record<string, unknown>): PhiStepsWidgetConfig {
  const { presentation: _choicePresentation, ...choice } = parsePhiStackChoiceControlConfig(config);
  return {
    ...choice,
    orientation: readString(config.orientation) === "vertical" ? "vertical" : "horizontal",
    stepMarker: readString(config.stepMarker) === "dot" ? "dot" : "number",
    navigable: readBoolean(config.navigable) ?? false,
  };
}

export const PHI_STEPS_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("steps"),
  typeKey: "steps",
  translatesOwnText: true,
  title: "Steps",
  description: "Where a sequence stands, as numbered steps; can follow and drive a Stack.",
  category: "content",
  icon: "antd:ordered-list-outlined",
  iconFamily: "basic",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_SELECT_CONTROL_SIGNALS,
  },
  fields: [
    { key: "value", type: "string", label: "Current Step" },
    PHI_CHOICE_CONTROL_VALUE_MODE_FIELD,
    ...PHI_CHOICE_CONTROL_OPTION_FIELDS,
    {
      key: "orientation",
      type: "choice",
      label: "Orientation",
      heading: "Steps",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
      ],
    },
    {
      key: "stepMarker",
      type: "choice",
      label: "Marker",
      options: [
        { value: "number", label: "Numbers" },
        { value: "dot", label: "Dots" },
      ],
    },
    { key: "navigable", type: "boolean", label: "Navigable" },
    ...PHI_CHOICE_CONTROL_CONFIG_FIELDS,
  ],
  defaultConfig: {
    key: "steps",
    valueMode: "raw",
    optionsProvider: null,
    orientation: "horizontal",
    stepMarker: "number",
    navigable: false,
    value: "step1",
    options: [
      { value: "step1", label: "Step 1" },
      { value: "step2", label: "Step 2" },
      { value: "step3", label: "Step 3" },
    ],
  },
  parseConfig: parsePhiStepsWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiStepsWidgetConfig>,
  | "translatesOwnText"
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
