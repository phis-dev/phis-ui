"use client";

import type { ReactNode } from "react";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";

/** The label column every Inspector row shares, so a control that draws its own header lines up with the rest. */
export const PHI_INSPECTOR_FIELD_LABEL_WIDTH = 140;

export function PhiInspectorFieldRow({
  label,
  children,
  labelWidth = PHI_INSPECTOR_FIELD_LABEL_WIDTH,
}: {
  label: ReactNode;
  children: ReactNode;
  labelWidth?: number;
}) {
  return (
    <PhiFlexControl align="flex-start" gap={12} wrap={false} style={{ width: "100%" }}>
      <PhiTypographyControl
        style={{ flex: `0 0 ${labelWidth}px`, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "var(--ant-control-height)" }}
      >
        {label}
      </PhiTypographyControl>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{children}</div>
    </PhiFlexControl>
  );
}
