"use client";

import type { ReactNode } from "react";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiTruncatedHoverText } from "../controls/phi-truncated-hover-text";
import { PhiTypographyControl } from "../controls/phi-typography-control";

/** The label column every Inspector row shares, so a control that draws its own header lines up with the rest. */
export const PHI_INSPECTOR_FIELD_LABEL_WIDTH = 140;

/* The box that cuts the words is the one the hover text measures. */
const PHI_INSPECTOR_FIELD_LABEL_TEXT_STYLE = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

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
      <PhiTypographyControl style={{ flex: `0 0 ${labelWidth}px`, minWidth: 0, lineHeight: "var(--phi-control-height)" }}>
        {/* A name cut short by the column says the rest in the house tooltip, and only then. */}
        <PhiTruncatedHoverText title={label}>
          <span style={PHI_INSPECTOR_FIELD_LABEL_TEXT_STYLE}>{label}</span>
        </PhiTruncatedHoverText>
      </PhiTypographyControl>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{children}</div>
    </PhiFlexControl>
  );
}
