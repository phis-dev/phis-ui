"use client";

import type { ReactNode } from "react";
import { Switch } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiSwitchControlProps = {
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
