"use client";

import type { ReactNode } from "react";
import { Flex, Typography } from "antd";

export function PhiInspectorFieldRow({
  label,
  children,
  labelWidth = 140,
}: {
  label: ReactNode;
  children: ReactNode;
  labelWidth?: number;
}) {
  return (
    <Flex align="flex-start" gap={12} wrap={false} style={{ width: "100%" }}>
      <Typography.Text
        style={{ flex: `0 0 ${labelWidth}px`, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "var(--ant-control-height)" }}
      >
        {label}
      </Typography.Text>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{children}</div>
    </Flex>
  );
}
