"use client";

import { Select } from "antd";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { normalizePhiPaddingWidgetConfig, type PhiCmsPaddingWidgetConfig } from "../../types/cms-config";
import {
  PHI_PADDING_WIDGET_DEFAULT_LABELS,
  type PhiPaddingWidgetLabels,
} from "../widgets/label-types/padding";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiLabeledControl } from "./phi-labeled-control";
import type { PhiControlOption } from "./phi-control-options";
import type { PhiWidgetControlMode } from "../../types/widget-ui";
import {
  PHI_SPACING_SCALE_KEYS,
  resolvePhiSpacingScaleKey,
  resolvePhiSpacingScaleValue,
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

function normalizePaddingScaleKey(value: number | string | null | undefined): PhiPaddingScaleKey | null {
  return resolvePhiSpacingScaleKey(value);
}

function resolveNextPadding(
  currentValue: PhiCmsPaddingWidgetConfig | null,
  key: "padding" | "gap" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft",
  value: PhiPaddingScaleKey,
) {
  // A padding and a gap are steps of the same scale (theme/phi-tokens.ts).
  const nextValue = resolvePhiSpacingScaleValue(value);
  const nextPadding: PhiCmsPaddingWidgetConfig = {
    ...(currentValue ?? {}),
    [key]: nextValue ?? undefined,
  };

  /*
   * Nothing stated at all clears the config -- and a gap is something stated.
   *
   * It was left out of this test, so a Layout whose defaults carry no padding lost its gap on the way
   * out: the value was written into `nextPadding` and the very next line threw the whole object away
   * as empty. Most Layout defaults are exactly that shape (a Masonry is `columns` and `gap`), so the
   * gap field looked dead everywhere except where somebody had also set a padding.
   */
  if (
    nextPadding.padding == null &&
    nextPadding.gap == null &&
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
  disabled: boolean,
  options: readonly PhiControlOption<PhiPaddingScaleKey>[],
  onChange: (nextValue: PhiPaddingScaleKey) => void,
) {
  return (
    <PhiLabeledControl description={label} fill>
      <Select<PhiPaddingScaleKey>
        aria-label={label}
        disabled={disabled}
        value={normalizePaddingScaleKey(value) ?? "none"}
        onChange={onChange}
        options={[...options]}
        style={{ width: "100%", minWidth: 0 }}
      />
    </PhiLabeledControl>
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
  const scaleOptions = useMemo<readonly PhiControlOption<PhiPaddingScaleKey>[]>(
    () => PHI_SPACING_SCALE_KEYS.map((key) => ({ value: key, label: labels.scaleSizes[key] })),
    [labels],
  );
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
        isDisabled,
        scaleOptions,
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
        isDisabled,
        scaleOptions,
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
            isDisabled,
            scaleOptions,
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
        isDisabled,
        scaleOptions,
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
        isDisabled,
        scaleOptions,
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
