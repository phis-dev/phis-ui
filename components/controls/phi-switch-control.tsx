"use client";

import type { ReactNode } from "react";
import { Switch } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";

export type PhiSwitchControlProps = {
  /** The DOM id of the input, so a `<label for>` outside the control can name it. */
  id?: string;
  checked?: boolean;
  label?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  /** What the switch reads while on. */
  checkedLabel?: ReactNode;
  /** What the switch reads while off. */
  uncheckedLabel?: ReactNode;
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
  checkedLabel,
  uncheckedLabel,
  size,
  onChange,
}: PhiSwitchControlProps) {
  const { labelId, labelledBy } = usePhiControlLabel(label);
  return (
    <PhiLabeledControl label={label} labelId={labelId}>
      <Switch
        id={id}
        aria-labelledby={labelledBy}
        checked={checked}
        disabled={disabled || readOnly || !onChange}
        loading={loading}
        checkedChildren={checkedLabel}
        unCheckedChildren={uncheckedLabel}
        size={size}
        onChange={onChange}
      />
    </PhiLabeledControl>
  );
}
