"use client";

import { PHI_THEME_CUSTOM_COLOR_KEYS } from "../../theme/phi-theme-presets";
import { createPhiColorPickerPresets } from "../widgets/config/color-picker-presets";
import {
  PHI_COLOR_PICKER_DEFAULT_LABELS,
  type PhiColorPickerLabels,
} from "../widgets/label-types/color-picker";
import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiColorPickerPresets } from "./phi-color-control";

const PHI_PRIMARY_COLOR_TOKEN_KEYS = [
  "colorPrimaryBg",
  "colorPrimaryBgHover",
  "colorPrimaryBorder",
  "colorPrimaryBorderHover",
  "colorPrimaryHover",
  "colorPrimary",
  "colorPrimaryActive",
  "colorPrimaryTextHover",
  "colorPrimaryText",
  "colorPrimaryTextActive",
] as const;

const PHI_TEXT_COLOR_TOKEN_KEYS = [
  "colorTextBase",
  "colorText",
  "colorTextSecondary",
  "colorTextTertiary",
  "colorTextQuaternary",
  "colorTextHeading",
  "colorTextLabel",
  "colorTextDescription",
  "colorTextPlaceholder",
  "colorTextDisabled",
] as const;

export type PhiColorControlCustomColor = {
  key: string;
  label: string;
  value: string;
};

export function usePhiColorControlPresets({
  labels = PHI_COLOR_PICKER_DEFAULT_LABELS,
  customColors,
  presets,
}: {
  labels?: PhiColorPickerLabels;
  customColors?: readonly PhiColorControlCustomColor[];
  presets?: PhiColorPickerPresets;
} = {}): PhiColorPickerPresets {
  const { customColors: publishedThemePalette, token } = usePhiConfig();
  const resolvedCustomColors = customColors ?? PHI_THEME_CUSTOM_COLOR_KEYS.map((key, index) => ({
    key,
    label: `${labels.custom} ${index + 1}`,
    value: publishedThemePalette[key],
  }));
  const resolvedPresets = presets ?? createPhiColorPickerPresets(labels);
  const localizedPresetLabels = labels.colors as Record<string, string>;

  return [
    ...(resolvedCustomColors.length > 0
      ? [{
          key: "phi-custom",
          label: labels.custom,
          colors: resolvedCustomColors.map((color) => color.value),
          colorLabels: resolvedCustomColors.map((color) => color.label),
          defaultOpen: true,
        }]
      : []),
    {
      key: "phi-primary",
      label: labels.colors.primary,
      colors: PHI_PRIMARY_COLOR_TOKEN_KEYS.map((key) => token[key]),
      colorLabels: [...PHI_PRIMARY_COLOR_TOKEN_KEYS],
    },
    {
      key: "phi-text",
      label: labels.colors.text,
      colors: PHI_TEXT_COLOR_TOKEN_KEYS.map((key) => token[key]),
      colorLabels: [...PHI_TEXT_COLOR_TOKEN_KEYS],
    },
    ...resolvedPresets.map((preset) => ({
      ...preset,
      label: localizedPresetLabels[preset.key] ?? preset.label,
      colors: [...preset.colors],
      defaultOpen: false,
    })),
  ];
}
