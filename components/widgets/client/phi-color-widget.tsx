"use client";

import { type ReactNode } from "react";

import { Flex, Typography } from "antd";

import { usePhiConfig } from "../../root/phi-config-provider";
import type { PhiColorWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/color/config";
import { createPhiColorPickerPresets } from "../config/color-picker-presets";
import {
  PHI_COLOR_PICKER_DEFAULT_LABELS,
  type PhiColorPickerLabels,
} from "../label-types/color-picker";
import {
  PhiColorControl,
  type PhiColorPickerMode,
} from "../../controls/phi-color-control";
import type { PhiPickerPlacement } from "../../controls/phi-picker-control-contract";
import {
  type PhiColorControlCustomColor,
  usePhiColorControlPresets,
} from "../../controls/use-phi-color-control-presets";
import { usePhiControlSignalController } from "./shared/phi-control-signals";

export type PhiColorWidgetProps = {
  config?: PhiColorWidgetConfig | null;
  blockId?: string | number | null;
  label?: string;
  value?: string | null;
  defaultValue?: string;
  tokenKey?: string;
  disabled?: boolean;
  signalsEnabled?: boolean;
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
export function PhiColorWidget({
  config,
  label = config?.label,
  value = config?.value,
  defaultValue = config?.defaultValue ?? "#1677ff",
  tokenKey = config?.key,
  disabled = config?.disabled ?? false,
  signalsEnabled = true,
  mode,
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
}: PhiColorWidgetProps) {
  const { token } = usePhiConfig();
  const resolvedValue = value?.trim() || defaultValue;
  const pickerPresets = usePhiColorControlPresets({ labels, customColors, presets });
  const controlSignals = usePhiControlSignalController<string>({
    key: config?.key ?? tokenKey ?? "color",
    signalRoutes: config?.signalRoutes,
    typeKey: "color",
    signalsEnabled,
    initialDisabled: disabled,
    initialReadOnly: config?.readOnly === true,
    clearValue: defaultValue,
    onSetValue: (nextValue) => {
      const normalized = typeof nextValue === "string" ? nextValue : defaultValue;
      onChange?.(normalized, tokenKey);
      onValueChange?.(normalized, tokenKey);
    },
    coerceValue: (nextValue) => (typeof nextValue === "string" ? nextValue : null),
  });

  function publish(nextValue: string | null) {
    if (controlSignals.readOnly) {
      return;
    }
    if (nextValue == null) {
      onValueChange?.(null, tokenKey);
      onClear?.();
      controlSignals.emitClear();
      return;
    }
    onChange?.(nextValue, tokenKey);
    onValueChange?.(nextValue, tokenKey);
    controlSignals.emitChange(nextValue);
  }

  return (
    <Flex
      vertical
      gap={token.paddingXXS}
      align="flex-start"
      style={{ width: children ? "auto" : "100%", minWidth: 0, maxWidth: "100%" }}
    >
      {label ? (
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          {label}
        </Typography.Text>
      ) : null}
      <PhiColorControl
        mode={mode ?? config?.mode ?? "single"}
        placement={placement}
        disabled={controlSignals.disabled || controlSignals.readOnly}
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
        showText={!children}
      >
        {children}
      </PhiColorControl>
    </Flex>
  );
}
