"use client";

import type { ReactNode } from "react";
import { Checkbox } from "antd";

import type { PhiControlSize } from "../../types/control";
import { usePhiConfig } from "../root/phi-config-provider";

export type PhiCheckboxControlProps = {
  checked?: boolean;
  label?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  indeterminate?: boolean;
  /**
   * The box has one size; a `small` checkbox writes its sentence in the small text size, as a small
   * input writes its value (`inputFontSizeSM`). Medium and large write the text they inherit.
   */
  size?: PhiControlSize;
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
  size,
  onFocus,
  onBlur,
  onChange,
}: PhiCheckboxControlProps) {
  const { token } = usePhiConfig();
  return (
    <Checkbox
      checked={checked}
      disabled={disabled || readOnly || !onChange}
      indeterminate={indeterminate}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(event) => onChange?.(event.target.checked)}
    >
      {size === "small" && label != null ? <span style={{ fontSize: token.fontSizeSM }}>{label}</span> : label}
    </Checkbox>
  );
}
