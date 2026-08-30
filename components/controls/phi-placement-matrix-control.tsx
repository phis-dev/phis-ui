"use client";

import { Button, Tooltip, theme } from "antd";

import {
  PHI_ANCHOR_WIDGET_DEFAULT_LABELS,
  PHI_ANCHOR_WIDGET_PLACEMENTS,
  type PhiAnchorWidgetLabels,
  type PhiAnchorWidgetPlacement,
} from "./phi-anchor-control-contract";
import type { PhiWidgetControlMode } from "../../types/widget-ui";

export type PhiPlacementMatrixControlProps = {
  value?: PhiAnchorWidgetPlacement | null;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: PhiWidgetControlMode;
  labels?: PhiAnchorWidgetLabels;
  onChange?: (value: PhiAnchorWidgetPlacement) => void;
};

export function PhiPlacementMatrixControl({
  value = null,
  disabled = false,
  readOnly = false,
  mode = "control",
  labels = PHI_ANCHOR_WIDGET_DEFAULT_LABELS,
  onChange,
}: PhiPlacementMatrixControlProps) {
  const { token } = theme.useToken();
  const isDisabled = disabled || readOnly || !onChange || mode === "preview";

  return (
    <div style={{ width: "fit-content", maxWidth: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 2rem)",
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        {PHI_ANCHOR_WIDGET_PLACEMENTS.map((placement, index) => {
          const selected = value === placement;
          const column = index % 3;
          const row = Math.floor(index / 3);
          const borderRadius = {
            borderTopLeftRadius: row === 0 && column === 0 ? token.borderRadius : 0,
            borderTopRightRadius: row === 0 && column === 2 ? token.borderRadius : 0,
            borderBottomLeftRadius: row === 2 && column === 0 ? token.borderRadius : 0,
            borderBottomRightRadius: row === 2 && column === 2 ? token.borderRadius : 0,
          };

          const button = (
            <Button
              key={placement}
              size="small"
              disabled={isDisabled}
              aria-pressed={selected}
              aria-label={labels.positions[placement]}
              onClick={() => onChange?.(placement)}
              style={{
                position: "relative",
                zIndex: selected ? 2 : 1,
                marginInlineStart: column === 0 ? 0 : -1,
                marginBlockStart: row === 0 ? 0 : -1,
                height: "2rem",
                minWidth: "2rem",
                width: "2rem",
                padding: 0,
                borderColor: selected ? token.colorPrimary : token.colorBorder,
                background: selected ? token.colorPrimaryBg : token.colorBgContainer,
                boxShadow: "none",
                ...borderRadius,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: selected ? 10 : 6,
                    height: selected ? 10 : 6,
                    borderRadius: "50%",
                    background: selected ? token.colorPrimary : token.colorTextTertiary,
                    transition: "all 0.15s ease",
                  }}
                />
              </span>
            </Button>
          );

          return (
            <Tooltip key={placement} title={labels.positions[placement]} placement="top">
              {button}
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
