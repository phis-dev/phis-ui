"use client";

import { Select, Tooltip } from "antd";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { normalizePhiPaddingWidgetConfig, type PhiCmsPaddingWidgetConfig } from "../../types/cms-config";
import {
  PHI_PADDING_WIDGET_DEFAULT_LABELS,
  type PhiPaddingWidgetLabels,
} from "../widgets/label-types/padding";
import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiWidgetControlMode } from "../../types/widget-ui";
import {
  PHI_SPACING_SCALE_KEY_OPTIONS,
  resolvePhiSpacingScaleKey,
  resolvePhiSpacingScaleValue,
  type PhiSpacingScaleFamily,
  type PhiSpacingScaleKey,
} from "../widgets/config/spacing-options";

export type PhiPaddingScaleKey = PhiSpacingScaleKey;

export type PhiPaddingControlProps = {
  value?: PhiCmsPaddingWidgetConfig | null;
  config?: PhiCmsPaddingWidgetConfig | null;
  disabled?: boolean;
  mode?: PhiWidgetControlMode;
  labels?: PhiPaddingWidgetLabels;
  showGap?: boolean;
  onChange?: (value: PhiCmsPaddingWidgetConfig | null) => void;
};

function resolvePaddingScaleValue(
  key: "padding" | "gap" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft",
  value: PhiPaddingScaleKey,
) {
  return resolvePhiSpacingScaleValue(value, key === "gap" ? "margin" : "padding");
}

function normalizePaddingScaleKey(
  value: number | string | null | undefined,
  family: PhiSpacingScaleFamily,
): PhiPaddingScaleKey | null {
  return resolvePhiSpacingScaleKey(value, family);
}

function resolveNextPadding(
  currentValue: PhiCmsPaddingWidgetConfig | null,
  key: "padding" | "gap" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft",
  value: PhiPaddingScaleKey,
) {
  const nextValue = resolvePaddingScaleValue(key, value);
  const nextPadding: PhiCmsPaddingWidgetConfig = {
    ...(currentValue ?? {}),
    [key]: nextValue ?? undefined,
  };

  if (
    nextPadding.padding == null &&
    nextPadding.paddingTop == null &&
    nextPadding.paddingRight == null &&
    nextPadding.paddingBottom == null &&
    nextPadding.paddingLeft == null
  ) {
    return null;
  }

  return nextPadding;
}

function renderPaddingGridCell(content: ReactNode, style?: CSSProperties) {
  return (
    <div
      style={{
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {content}
    </div>
  );
}

function renderPaddingInput(
  label: string,
  value: number | string | null | undefined,
  family: PhiSpacingScaleFamily,
  disabled: boolean,
  onChange: (nextValue: PhiPaddingScaleKey) => void,
) {
  return (
    <Tooltip title={label} placement="top">
      <Select<PhiPaddingScaleKey>
        aria-label={label}
        disabled={disabled}
        value={normalizePaddingScaleKey(value, family) ?? "none"}
        onChange={onChange}
        options={[...PHI_SPACING_SCALE_KEY_OPTIONS]}
        style={{ width: "100%", minWidth: 0 }}
      />
    </Tooltip>
  );
}

export function PhiPaddingControl({
  value,
  config,
  disabled = false,
  mode = "control",
  labels = PHI_PADDING_WIDGET_DEFAULT_LABELS,
  showGap = true,
  onChange,
}: PhiPaddingControlProps) {
  const { token } = usePhiConfig();
  const currentValue = useMemo(
    () => normalizePhiPaddingWidgetConfig(value ?? config ?? null) ?? null,
    [value, config],
  );
  const isDisabled = disabled || !onChange;
  const [displayState, setDisplayState] = useState(() => ({ source: currentValue, value: currentValue }));

  function emit(nextValue: PhiCmsPaddingWidgetConfig | null) {
    onChange?.(nextValue);
  }

  const displayValue = displayState.source === currentValue ? displayState.value : currentValue;
  const resolvedDisplayValue = displayValue ?? currentValue;
  const resolvedGapValue = resolvedDisplayValue?.gap ?? null;

  const grid = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
        gap: token.paddingXS,
        width: "100%",
        alignItems: "stretch",
      }}
    >
      {renderPaddingGridCell(null)}
      {renderPaddingInput(
        labels.fields.top,
        resolvedDisplayValue?.paddingTop ?? resolvedDisplayValue?.padding,
        "padding",
        isDisabled,
        (next) => {
          const nextPadding = resolveNextPadding(resolvedDisplayValue, "paddingTop", next);
          setDisplayState({ source: currentValue, value: nextPadding });
          emit(nextPadding);
        },
      )}
      {renderPaddingGridCell(null)}

      {renderPaddingInput(
        labels.fields.left,
        resolvedDisplayValue?.paddingLeft ?? resolvedDisplayValue?.padding,
        "padding",
        isDisabled,
        (next) => {
          const nextPadding = resolveNextPadding(resolvedDisplayValue, "paddingLeft", next);
          setDisplayState({ source: currentValue, value: nextPadding });
          emit(nextPadding);
        },
      )}
      {showGap
        ? renderPaddingInput(
            labels.fields.gap,
            resolvedGapValue,
            "margin",
            isDisabled,
            (next) => {
              const nextPadding = resolveNextPadding(resolvedDisplayValue, "gap", next);
              setDisplayState({ source: currentValue, value: nextPadding });
              emit(nextPadding);
            },
          )
        : renderPaddingGridCell(null)}
      {renderPaddingInput(
        labels.fields.right,
        resolvedDisplayValue?.paddingRight ?? resolvedDisplayValue?.padding,
        "padding",
        isDisabled,
        (next) => {
          const nextPadding = resolveNextPadding(resolvedDisplayValue, "paddingRight", next);
          setDisplayState({ source: currentValue, value: nextPadding });
          emit(nextPadding);
        },
      )}

      {renderPaddingGridCell(null)}
      {renderPaddingInput(
        labels.fields.bottom,
        resolvedDisplayValue?.paddingBottom ?? resolvedDisplayValue?.padding,
        "padding",
        isDisabled,
        (next) => {
          const nextPadding = resolveNextPadding(resolvedDisplayValue, "paddingBottom", next);
          setDisplayState({ source: currentValue, value: nextPadding });
          emit(nextPadding);
        },
      )}
      {renderPaddingGridCell(null)}
    </div>
  );

  if (mode === "preview") {
    return <div style={{ display: "grid", gap: token.paddingXS, width: "100%" }}>{grid}</div>;
  }

  return <div style={{ display: "grid", gap: token.paddingXS, width: "100%" }}>{grid}</div>;
}
