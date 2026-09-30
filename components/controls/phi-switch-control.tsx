"use client";

import type { ReactNode } from "react";
import { Switch } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiSwitchControlProps = {
  /** The DOM id of the input, so a `<label for>` outside the control can name it. */
  id?: string;
  checked?: boolean;
  label?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  checkedChildren?: ReactNode;
  unCheckedChildren?: ReactNode;
  size?: Exclude<PhiControlSize, "large">;
  onChange?: (checked: boolean) => void;
};

export function PhiSwitchControl({
  id,
  checked,
  label,
  disabled,
  readOnly,
  loading,
  checkedChildren,
  unCheckedChildren,
  size,
  onChange,
}: PhiSwitchControlProps) {
  return (
    <PhiLabeledControl label={label}>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled || readOnly || !onChange}
        loading={loading}
        checkedChildren={checkedChildren}
        unCheckedChildren={unCheckedChildren}
        size={size}
        onChange={onChange}
      />
    </PhiLabeledControl>
  );
}
