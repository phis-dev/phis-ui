"use client";

import { PHI_COLOR } from "../../theme/antd-css-var-contract";
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

/** A Theme colour token's role, the custom property Ant Design writes for it: `colorPrimaryBg` → `var(--ant-color-primary-bg)`. */
function resolvePhiColorTokenReference(tokenKey: string) {
  return `var(--ant-${tokenKey.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)})`;
}

/**
 * The colour picker's swatches: the Theme's custom colours, its primary and text ladders, then the fixed
 * palettes.
 *
 * With `storeThemeRoles`, a Theme swatch stores the role it shows (`PHI_COLOR.custom3`,
 * `PHI_COLOR.primaryBg`) rather than its colour, so what an author picks follows the Theme and the mode.
 * Every field that styles content wants that. The Theme workspace does not: it is where those colours are
 * set, and a palette that named its own roles would point at itself.
 */
export function usePhiColorControlPresets({
  labels = PHI_COLOR_PICKER_DEFAULT_LABELS,
  customColors,
  presets,
  storeThemeRoles = false,
}: {
  labels?: PhiColorPickerLabels;
  customColors?: readonly PhiColorControlCustomColor[];
  presets?: PhiColorPickerPresets;
  storeThemeRoles?: boolean;
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
          ...(storeThemeRoles && !customColors
            ? { colorReferences: PHI_THEME_CUSTOM_COLOR_KEYS.map((key) => PHI_COLOR[key]) }
            : {}),
          defaultOpen: true,
        }]
      : []),
    {
      key: "phi-primary",
      label: labels.colors.primary,
      colors: PHI_PRIMARY_COLOR_TOKEN_KEYS.map((key) => token[key]),
      colorLabels: [...PHI_PRIMARY_COLOR_TOKEN_KEYS],
      ...(storeThemeRoles ? { colorReferences: PHI_PRIMARY_COLOR_TOKEN_KEYS.map(resolvePhiColorTokenReference) } : {}),
    },
    {
      key: "phi-text",
      label: labels.colors.text,
      colors: PHI_TEXT_COLOR_TOKEN_KEYS.map((key) => token[key]),
      colorLabels: [...PHI_TEXT_COLOR_TOKEN_KEYS],
      ...(storeThemeRoles ? { colorReferences: PHI_TEXT_COLOR_TOKEN_KEYS.map(resolvePhiColorTokenReference) } : {}),
    },
    ...resolvedPresets.map((preset) => ({
      ...preset,
      label: localizedPresetLabels[preset.key] ?? preset.label,
      colors: [...preset.colors],
      defaultOpen: false,
    })),
  ];
}
