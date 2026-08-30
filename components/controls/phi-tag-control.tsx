"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tag } from "antd";

export type PhiTagControlProps = {
  children: ReactNode;
  color?: string;
  variant?: "filled" | "outlined" | "solid";
  style?: CSSProperties;
};

export function PhiTagControl({
  children,
  color,
  variant = "outlined",
  style,
}: PhiTagControlProps) {
  return (
    <Tag color={color} variant={variant} style={{ marginInlineEnd: 0, ...style }}>
      {children}
    </Tag>
  );
}
