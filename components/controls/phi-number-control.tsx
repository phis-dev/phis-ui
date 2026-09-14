"use client";

import type { CSSProperties, FocusEventHandler, KeyboardEventHandler, ReactNode } from "react";
import { InputNumber } from "antd";
import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiNumberControlProps = {
  value?: number | null;
  label?: string;
  /**
   * What the number is in, shown inside the field.
   *
   * A unit belongs to the value, not to the field's name: a label saying "Tracking (em)" leaves the
   * number looking unitless the moment the label scrolls out of sight, and it is the reading that
   * invites somebody to type the unit in as well.
   */
  prefix?: ReactNode;
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
  prefix,
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
      prefix={prefix}
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
