"use client";

import { type ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { createPhiColorPickerPresets } from "../widgets/config/color-picker-presets";
import {
  PHI_COLOR_PICKER_DEFAULT_LABELS,
  type PhiColorPickerLabels,
} from "../widgets/label-types/color-picker";
import { PhiColorControl, type PhiColorPickerMode } from "./phi-color-control";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";
import {
  type PhiColorControlCustomColor,
  usePhiColorControlPresets,
} from "./use-phi-color-control-presets";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiTypographyControl } from "./phi-typography-control";

export type PhiColorFieldControlProps = {
  label?: string;
  value?: string | null;
  defaultValue?: string;
  /** Handed back with every change, so one handler can serve several fields. */
  tokenKey?: string;
  disabled?: boolean;
  mode?: PhiColorPickerMode;
  placement?: PhiPickerPlacement;
  allowClear?: boolean;
  children?: ReactNode;
  presets?: ReturnType<typeof createPhiColorPickerPresets>;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  popupClassName?: string;
  renderPanel?: (panel: ReactNode) => ReactNode;
  onOpenChange?: (open: boolean) => void;
  onCommit?: (value: string | null, originalValue: string | null) => void;
  onDiscard?: (originalValue: string | null) => void;
  onClear?: () => void;
  customColors?: ReadonlyArray<PhiColorControlCustomColor>;
  labels?: PhiColorPickerLabels;
  onChange?: (value: string, tokenKey?: string) => void;
  onValueChange?: (value: string | null, tokenKey?: string) => void;
};

/**
 * A labelled colour field: the colour primitive with the Site's presets and custom colours.
 *
 * A Control, so every Module may use it -- the Theme's brand controls, the Builder's Inspector, the
 * authoring tool buttons. The Color Widget is the Core Module's placement of it, which adds its config
 * and its signals.
 */
export function PhiColorFieldControl({
  label,
  value,
  defaultValue = "#1677ff",
  tokenKey,
  disabled = false,
  mode = "single",
  placement,
  allowClear,
  children,
  presets,
  getPopupContainer,
  popupClassName,
  renderPanel,
  onOpenChange,
  onCommit,
  onDiscard,
  onClear,
  customColors,
  labels = PHI_COLOR_PICKER_DEFAULT_LABELS,
  onChange,
  onValueChange,
}: PhiColorFieldControlProps) {
  const { token } = usePhiConfig();
  const resolvedValue = value?.trim() || defaultValue;
  const pickerPresets = usePhiColorControlPresets({ labels, customColors, presets });

  function publish(nextValue: string | null) {
    if (nextValue == null) {
      onValueChange?.(null, tokenKey);
      onClear?.();
      return;
    }
    onChange?.(nextValue, tokenKey);
    onValueChange?.(nextValue, tokenKey);
  }

  return (
    <PhiFlexControl
      vertical
      gap={token.paddingXXS}
      align="flex-start"
      style={{ width: children ? "auto" : "100%", minWidth: 0, maxWidth: "100%" }}
    >
      {label ? (
        <PhiTypographyControl type="secondary" style={{ fontSize: token.fontSizeSM }}>
          {label}
        </PhiTypographyControl>
      ) : null}
      <PhiColorControl
        mode={mode}
        placement={placement}
        disabled={disabled}
        allowClear={allowClear}
        value={resolvedValue}
        defaultValue={defaultValue}
        getPopupContainer={getPopupContainer}
        popupClassName={popupClassName}
        renderPanel={renderPanel}
        onOpenChange={onOpenChange}
        onCommit={onCommit}
        onDiscard={onDiscard}
        presets={pickerPresets}
        onChange={publish}
      >
        {children}
      </PhiColorControl>
    </PhiFlexControl>
  );
}
