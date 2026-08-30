"use client";

import type { ReactNode } from "react";
import { Badge, Button, Tooltip } from "antd";
import type { ButtonProps } from "antd";

import type { PhiControlSize } from "../../types/control";
import type { PhiButtonType } from "./phi-button-types";

export type PhiControlBadgePresentation = {
  enabled?: boolean;
  value?: string | number | null;
  color?: string;
  overflowCount?: number;
  showZero?: boolean;
};

export type PhiButtonControlProps = {
  label?: ReactNode;
  ariaLabel?: string;
  tooltip?: ReactNode;
  icon?: ReactNode;
  type?: PhiButtonType;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  htmlType?: ButtonProps["htmlType"];
  block?: boolean;
  size?: PhiControlSize;
  style?: ButtonProps["style"];
  badge?: PhiControlBadgePresentation;
  onClick?: () => void;
};

export function PhiButtonControl({
  label,
  ariaLabel,
  tooltip,
  icon,
  type = "default",
  danger,
  disabled,
  loading,
  htmlType,
  block,
  size,
  style,
  badge,
  onClick,
}: PhiButtonControlProps) {
  const visibleTooltip = typeof label === "string" && typeof tooltip === "string" && label === tooltip
    ? null
    : tooltip;
  const button = (
    <Button
      aria-label={ariaLabel}
      type={type}
      danger={danger}
      disabled={disabled || (!onClick && htmlType !== "submit")}
      loading={loading}
      htmlType={htmlType}
      block={block}
      size={size}
      style={style}
      icon={icon}
      onClick={onClick}
    >
      {label}
    </Button>
  );
  const badged = badge?.enabled ? (
    <Badge
      color={badge.color}
      count={badge.value ?? 0}
      overflowCount={badge.overflowCount}
      showZero={badge.showZero}
      size="small"
    >
      {button}
    </Badge>
  ) : button;

  return visibleTooltip ? <Tooltip title={visibleTooltip}>{badged}</Tooltip> : badged;
}
