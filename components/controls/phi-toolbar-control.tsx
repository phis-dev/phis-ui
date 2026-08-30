"use client";

import type { CSSProperties, ReactNode } from "react";
import { Flex, Space } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import { PhiButtonControl, type PhiControlBadgePresentation } from "./phi-button-control";
import type { PhiButtonType } from "./phi-button-types";

export type PhiToolbarControlItem = {
  key: string;
  label?: ReactNode;
  ariaLabel?: string;
  tooltip?: ReactNode;
  icon?: ReactNode;
  showLabel?: boolean;
  type?: PhiButtonType;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  badge?: PhiControlBadgePresentation;
};

export type PhiToolbarControlProps = {
  items?: readonly PhiToolbarControlItem[];
  children?: ReactNode;
  compact?: boolean;
  wrap?: boolean;
  showLabels?: boolean;
  disabled?: boolean;
  size?: PhiControlSize;
  style?: CSSProperties;
  onActivate?: (key: string) => void;
};

export function PhiToolbarControl({
  items = [],
  children,
  compact = true,
  wrap = false,
  showLabels = false,
  disabled,
  size,
  style,
  onActivate,
}: PhiToolbarControlProps) {
  const controls = items
    .filter((item) => item.visible !== false)
    .map((item) => (
      <PhiButtonControl
        key={item.key}
        ariaLabel={item.ariaLabel}
        label={(item.showLabel ?? (showLabels || !item.icon)) ? item.label : null}
        tooltip={item.tooltip}
        icon={item.icon}
        type={item.type}
        danger={item.danger}
        disabled={disabled || item.disabled}
        loading={item.loading}
        size={size}
        badge={item.badge}
        onClick={onActivate ? () => onActivate(item.key) : undefined}
      />
    ));

  if (compact && !wrap) {
    return <Space.Compact style={style}>{controls}{children}</Space.Compact>;
  }

  return (
    <Flex align="center" justify="center" gap={PHI_SPACE.xs} wrap={wrap ? "wrap" : false} style={style}>
      {controls}
      {children}
    </Flex>
  );
}
