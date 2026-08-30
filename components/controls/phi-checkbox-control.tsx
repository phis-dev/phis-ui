"use client";

import type { ReactNode } from "react";
import { Checkbox } from "antd";

export type PhiCheckboxControlProps = {
  checked?: boolean;
  label?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  indeterminate?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (checked: boolean) => void;
};

export function PhiCheckboxControl({
  checked,
  label,
  disabled,
  readOnly,
  indeterminate,
  onFocus,
  onBlur,
  onChange,
}: PhiCheckboxControlProps) {
  return (
    <Checkbox
      checked={checked}
      disabled={disabled || readOnly || !onChange}
      indeterminate={indeterminate}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(event) => onChange?.(event.target.checked)}
    >
      {label}
    </Checkbox>
  );
}
