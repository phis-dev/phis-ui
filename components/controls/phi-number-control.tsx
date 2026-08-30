"use client";

import type { CSSProperties, FocusEventHandler, KeyboardEventHandler } from "react";
import { InputNumber } from "antd";
import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiNumberControlProps = {
  value?: number | null;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  readOnly?: boolean;
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  style?: CSSProperties;
  onChange?: (value: number | null) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function PhiNumberControl({
  value,
  label,
  placeholder,
  min,
  max,
  step,
  precision,
  disabled,
  readOnly,
  size,
  variant,
  style,
  onChange,
  onBlur,
  onKeyDown,
}: PhiNumberControlProps) {
  const control = (
    <InputNumber
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      precision={precision}
      disabled={disabled || (!onChange && !readOnly)}
      readOnly={readOnly}
      size={size}
      variant={variant}
      style={style}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
  return <PhiLabeledControl label={label} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
}
