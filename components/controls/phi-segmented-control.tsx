"use client";

import { Segmented } from "antd";

import type { PhiControlSize } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiSegmentedControlProps<TValue extends string | number = string> = {
  value?: TValue;
  label?: string;
  options: readonly PhiControlOption<TValue>[];
  disabled?: boolean;
  readOnly?: boolean;
  block?: boolean;
  size?: PhiControlSize;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (value: TValue) => void;
};

export function PhiSegmentedControl<TValue extends string | number = string>({
  value,
  label,
  options,
  disabled,
  readOnly,
  block,
  size,
  onFocus,
  onBlur,
  onChange,
}: PhiSegmentedControlProps<TValue>) {
  const control = (
    <Segmented
      block={block}
      value={value ?? undefined}
      disabled={disabled || readOnly || !onChange}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled,
        tooltip: option.description,
      }))}
      size={size}
      onChange={(nextValue) => onChange?.(nextValue as TValue)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ minWidth: 0, width: block ? "100%" : undefined }}
    />
  );

  return <PhiLabeledControl label={label} fill={block}>{control}</PhiLabeledControl>;
}
