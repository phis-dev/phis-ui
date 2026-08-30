import {
  blue,
  cyan,
  geekblue,
  gold,
  gray,
  green,
  lime,
  magenta,
  orange,
  purple,
  red,
  volcano,
  yellow,
} from "@ant-design/colors";
import {
  PHI_COLOR_PICKER_DEFAULT_LABELS,
  type PhiColorPickerLabels,
} from "../label-types/color-picker";
import type { PhiColorPickerPresets } from "../../controls/phi-color-control";

export function createPhiColorPickerPresets(
  labels: PhiColorPickerLabels = PHI_COLOR_PICKER_DEFAULT_LABELS,
): PhiColorPickerPresets {
  return [
    { key: "red", label: labels.colors.red, colors: red },
    { key: "volcano", label: labels.colors.volcano, colors: volcano },
    { key: "orange", label: labels.colors.orange, colors: orange },
    { key: "gold", label: labels.colors.gold, colors: gold },
    { key: "yellow", label: labels.colors.yellow, colors: yellow },
    { key: "lime", label: labels.colors.lime, colors: lime },
    { key: "green", label: labels.colors.green, colors: green },
    { key: "cyan", label: labels.colors.cyan, colors: cyan },
    { key: "blue", label: labels.colors.blue, colors: blue },
    { key: "geekblue", label: labels.colors.geekblue, colors: geekblue },
    { key: "purple", label: labels.colors.purple, colors: purple },
    { key: "magenta", label: labels.colors.magenta, colors: magenta },
    { key: "gray", label: labels.colors.gray, colors: gray },
  ];
}

export const PHI_COLOR_PICKER_PRESETS = createPhiColorPickerPresets();

export const PHI_COLOR_PICKER_NEUTRAL_PRESETS: PhiColorPickerPresets = [
  { key: "gray", label: PHI_COLOR_PICKER_DEFAULT_LABELS.colors.gray, colors: gray },
];
