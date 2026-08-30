import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_SLIDER_TOOLTIP_MODES,
  type PhiSliderTooltipMode,
} from "../../../../../components/controls/phi-slider-control-contract";
import { PHI_NUMBER_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlStateConfig,
  type PhiControlStateConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import { readBoolean, readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiSliderWidgetConfig = PhiControlStateConfig & {
  label?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  dots?: boolean;
  included?: boolean;
  reverse?: boolean;
  tooltipMode?: PhiSliderTooltipMode;
  tooltipSuffix?: string;
};

export function clampPhiSliderValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readPhiSliderTooltipMode(value: unknown): PhiSliderTooltipMode | undefined {
  return typeof value === "string" && PHI_SLIDER_TOOLTIP_MODES.includes(value as PhiSliderTooltipMode)
    ? value as PhiSliderTooltipMode
    : undefined;
}

export function parsePhiSliderWidgetConfig(config: Record<string, unknown>): PhiSliderWidgetConfig {
  const min = readNumber(config.min) ?? 0;
  const configuredMax = readNumber(config.max);
  const max = configuredMax != null && configuredMax > min ? configuredMax : min + 100;
  const configuredStep = readNumber(config.step);
  const step = configuredStep != null && configuredStep > 0 ? configuredStep : 1;
  const value = clampPhiSliderValue(readNumber(config.value) ?? min, min, max);

  return {
    ...parsePhiControlStateConfig(config, { key: "slider" }),
    label: readString(config.label),
    value,
    min,
    max,
    step,
    dots: readBoolean(config.dots),
    included: readBoolean(config.included) ?? true,
    reverse: readBoolean(config.reverse),
    tooltipMode: readPhiSliderTooltipMode(config.tooltipMode),
    tooltipSuffix: readString(config.tooltipSuffix),
  };
}

export const PHI_SLIDER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("slider"),
  typeKey: "slider",
  title: "Slider",
  description: "Reusable scalar slider that emits typed number signals.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "fill-inline",
  runtimeSignals: { ...PHI_NUMBER_CONTROL_SIGNALS },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "value", type: "number", label: "Value" },
    { key: "min", type: "number", label: "Minimum" },
    { key: "max", type: "number", label: "Maximum" },
    { key: "step", type: "number", label: "Step", min: 0 },
    { key: "dots", type: "boolean", label: "Step dots" },
    { key: "included", type: "boolean", label: "Highlight selected range" },
    { key: "reverse", type: "boolean", label: "Reverse" },
    {
      key: "tooltipMode",
      type: "choice",
      label: "Tooltip",
      options: [
        { value: "auto", label: "Automatic" },
        { value: "always", label: "Always" },
        { value: "hidden", label: "Hidden" },
      ],
    },
    { key: "tooltipSuffix", type: "string", label: "Tooltip suffix" },
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "slider",
  },
  parseConfig: parsePhiSliderWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSliderWidgetConfig>,
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

export const PHI_SLIDER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Slider;
