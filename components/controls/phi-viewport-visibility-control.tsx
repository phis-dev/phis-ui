"use client";

import { Checkbox } from "antd";

import {
  PHI_VIEWPORT_ALL_FLAGS,
  PhiViewport,
  normalizePhiViewportFlags,
} from "../../types/access";

type PhiViewportVisibilityControlProps = {
  value?: number | null;
  disabled?: boolean;
  labels?: {
    compact: string;
    medium: string;
    wide: string;
  };
  onChange?: (value: number) => void;
};

const DEFAULT_LABELS = {
  compact: "Compact",
  medium: "Medium",
  wide: "Wide",
};

export function PhiViewportVisibilityControl({
  value,
  disabled = false,
  labels = DEFAULT_LABELS,
  onChange,
}: PhiViewportVisibilityControlProps) {
  const normalized = normalizePhiViewportFlags(value);
  const checkedValues = normalized === 0
    ? [PhiViewport.Compact, PhiViewport.Medium, PhiViewport.Wide]
    : [PhiViewport.Compact, PhiViewport.Medium, PhiViewport.Wide].filter(
        (flag) => (normalized & flag) !== 0,
      );

  return (
    <Checkbox.Group
      disabled={disabled || !onChange}
      value={checkedValues}
      options={[
        { label: labels.compact, value: PhiViewport.Compact },
        { label: labels.medium, value: PhiViewport.Medium },
        { label: labels.wide, value: PhiViewport.Wide },
      ]}
      onChange={(nextValues) => {
        const next = nextValues.reduce((flags, flag) => flags | Number(flag), 0);
        if (next === 0) {
          return;
        }
        onChange?.(next === PHI_VIEWPORT_ALL_FLAGS ? 0 : next);
      }}
    />
  );
}
