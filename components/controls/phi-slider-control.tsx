"use client";

import type { CSSProperties, ReactNode } from "react";
import { Slider } from "antd";

import { PhiLabeledControl } from "./phi-labeled-control";
import type { PhiSliderTooltipMode } from "./phi-slider-control-contract";

export type PhiSliderControlProps = {
  value?: number;
  label?: ReactNode;
  ariaLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  dots?: boolean;
  included?: boolean;
  reverse?: boolean;
  tooltipMode?: PhiSliderTooltipMode;
  tooltipSuffix?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  style?: CSSProperties;
  onChange?: (value: number) => void;
  onChangeComplete?: (value: number) => void;
};

export function PhiSliderControl({
  value,
  label,
  ariaLabel,
  min,
  max,
  step,
  dots,
  included,
  reverse,
  tooltipMode = "auto",
  tooltipSuffix,
  disabled,
  readOnly,
  style,
  onChange,
  onChangeComplete,
}: PhiSliderControlProps) {
  return (
    <PhiLabeledControl label={label} fill={style?.width === "100%"}>
      <Slider
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        value={value}
        min={min}
        max={max}
        step={step}
        dots={dots}
        included={included}
        reverse={reverse}
        disabled={disabled || readOnly || !onChange}
        tooltip={{
          open: tooltipMode === "always" ? true : tooltipMode === "hidden" ? false : undefined,
          formatter: tooltipSuffix == null
            ? undefined
            : (nextValue) => nextValue == null ? null : <>{nextValue}{tooltipSuffix}</>,
        }}
        style={{ minWidth: 0, flex: label == null ? undefined : "1 1 auto", ...style }}
        onChange={onChange}
        onChangeComplete={onChangeComplete}
      />
    </PhiLabeledControl>
  );
}
