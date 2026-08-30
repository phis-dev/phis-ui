"use client";

import type { CSSProperties } from "react";

import { StopOutlined } from "@ant-design/icons";

const PHI_COLOR_ERROR = "var(--ant-color-error)";

export type PhiMediaRestrictedIconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
  title?: string;
};

export function PhiMediaRestrictedIcon({
  size = 32,
  style,
  className,
  title = "not allowed",
}: PhiMediaRestrictedIconProps) {
  const iconStyle: CSSProperties = {
    fontSize: `${size / 16}rem`,
    color: PHI_COLOR_ERROR,
    ...style,
  };

  return <StopOutlined className={className} style={iconStyle} title={title} />;
}
