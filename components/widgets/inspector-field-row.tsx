"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PHI_FORM_DEFAULT_LAYOUT, PHI_FORM_GRID_LAST_LINE } from "@phis/contracts/forms";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiTruncatedHoverText } from "../controls/phi-truncated-hover-text";
import { PhiTypographyControl } from "../controls/phi-typography-control";

/** The label column every Inspector row shares, so a control that draws its own header lines up with the rest. */
export const PHI_INSPECTOR_FIELD_LABEL_WIDTH = 140;

/**
 * The label's share of an Inspector row inside a dialog -- the Overlay a list is edited in: the medium
 * tier of the house Form layout, ten of twenty-four tracks, so a row there splits 10 : 14 as a Form in a
 * one-column dialog does (owner, 2026-11-25). Read from the Form layout rather than restated, so the two
 * cannot drift apart. The narrow Inspector column keeps its fixed `PHI_INSPECTOR_FIELD_LABEL_WIDTH`.
 */
export const PHI_INSPECTOR_DIALOG_FIELD_LABEL_SHARE =
  (PHI_FORM_DEFAULT_LAYOUT.label.medium.end - PHI_FORM_DEFAULT_LAYOUT.label.medium.start) / (PHI_FORM_GRID_LAST_LINE - 1);

/**
 * Whether Inspector rows stand in a dialog rather than in the Inspector column. The dialog that holds
 * them says so; a row reads it for its split, and a collection reads it to edit its entries in place
 * instead of opening a second dialog over the first.
 */
export const PhiInspectorDialogContext = createContext(false);

const PHI_INSPECTOR_FIELD_ROW_GAP = 12;

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
  const inDialog = useContext(PhiInspectorDialogContext);
  const labelBasis = inDialog
    ? `calc((100% - ${PHI_INSPECTOR_FIELD_ROW_GAP}px) * ${PHI_INSPECTOR_DIALOG_FIELD_LABEL_SHARE})`
    : `${labelWidth}px`;
  return (
    <PhiFlexControl align="flex-start" gap={PHI_INSPECTOR_FIELD_ROW_GAP} wrap={false} style={{ width: "100%" }}>
      <PhiTypographyControl style={{ flex: `0 0 ${labelBasis}`, minWidth: 0, lineHeight: "var(--phi-control-height)" }}>
        {/* A name cut short by the column says the rest in the house tooltip, and only then. */}
        <PhiTruncatedHoverText title={label}>
          <span style={PHI_INSPECTOR_FIELD_LABEL_TEXT_STYLE}>{label}</span>
        </PhiTruncatedHoverText>
      </PhiTypographyControl>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{children}</div>
    </PhiFlexControl>
  );
}
