"use client";

import type { ReactNode } from "react";
import { Rate } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PhiIcon } from "../shell/phi-icon";
import { PhiLabeledControl } from "./phi-labeled-control";
import {
  normalizePhiRateCount,
  normalizePhiRateValue,
} from "./phi-rate-control-contract";

export type PhiRateControlProps = {
  value?: number;
  count?: number;
  allowHalf?: boolean;
  allowClear?: boolean;
  icon?: string;
  label?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  size?: PhiControlSize;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function PhiRateControl({
  value,
  count,
  allowHalf = false,
  allowClear = true,
  icon,
  label,
  description,
  ariaLabel,
  size,
  disabled,
  readOnly,
  onChange,
  onFocus,
  onBlur,
}: PhiRateControlProps) {
  const normalizedCount = normalizePhiRateCount(count);
  const normalizedValue = normalizePhiRateValue(value, normalizedCount, allowHalf);

  return (
    <PhiLabeledControl label={label} description={description}>
      <Rate
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        value={normalizedValue}
        count={normalizedCount}
        allowHalf={allowHalf}
        allowClear={allowClear}
        character={icon ? <PhiIcon name={icon} size="inherit" /> : undefined}
        size={size}
        disabled={disabled || readOnly || !onChange}
        keyboard
        onChange={(nextValue) => onChange?.(
          normalizePhiRateValue(nextValue, normalizedCount, allowHalf),
        )}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </PhiLabeledControl>
  );
}
