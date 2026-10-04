"use client";

import type { CSSProperties, ReactNode } from "react";
import { Slider } from "antd";

import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";
import type { PhiSliderTooltipMode } from "./phi-slider-control-contract";

type PhiSliderControlBaseProps = {
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
};

export type PhiSliderControlProps = PhiSliderControlBaseProps & (
  | {
      range?: false;
      value?: number;
      onChange?: (value: number) => void;
      onChangeComplete?: (value: number) => void;
    }
  | {
      /**
       * Two handles, a start and an end; the track between them can be dragged as a whole, which moves
       * the pair without changing the distance. The two never meet: a range is at least one `step`.
       */
      range: true;
      value?: readonly [number, number];
      onChange?: (value: [number, number]) => void;
      onChangeComplete?: (value: [number, number]) => void;
    }
);

/** A pair whose handles met or crossed, pushed one `step` apart on the side that has room. */
function separatePhiSliderRange(values: number[], step: number, min: number, max: number): [number, number] {
  const [start = min, end = max] = values;
  if (end - start >= step) return [start, end];
  return start + step <= max ? [start, start + step] : [end - step, end];
}

export function PhiSliderControl(props: PhiSliderControlProps) {
  const {
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
  } = props;
  const { labelId, labelledBy } = usePhiControlLabel(label, ariaLabel);
  const shared = {
    "aria-label": ariaLabel,
    ariaLabelledByForHandle: labelledBy,
    min,
    max,
    step,
    dots,
    included,
    reverse,
    disabled: disabled || readOnly || !props.onChange,
    tooltip: {
      open: tooltipMode === "always" ? true : tooltipMode === "hidden" ? false : undefined,
      formatter: tooltipSuffix == null
        ? undefined
        : (nextValue?: number) => nextValue == null ? null : <>{nextValue}{tooltipSuffix}</>,
    },
    style: { minWidth: 0, flex: label == null ? undefined : "1 1 auto", ...style },
  };
  const separate = (values: number[]) =>
    separatePhiSliderRange(values, step ?? 1, min ?? 0, max ?? 100);
  return (
    <PhiLabeledControl label={label} labelId={labelId} fill={style?.width === "100%"}>
      {props.range ? (
        <Slider
          {...shared}
          range={{ draggableTrack: true }}
          value={props.value ? [...props.value] : undefined}
          onChange={props.onChange ? (values: number[]) => props.onChange?.(separate(values)) : undefined}
          onChangeComplete={props.onChangeComplete
            ? (values: number[]) => props.onChangeComplete?.(separate(values))
            : undefined}
        />
      ) : (
        <Slider
          {...shared}
          value={props.value}
          onChange={props.onChange}
          onChangeComplete={props.onChangeComplete}
        />
      )}
    </PhiLabeledControl>
  );
}
