"use client";

import type { CSSProperties } from "react";
import { Segmented } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PHI_THEME_GRADIENT_CSS_VARS, type PhiThemeGradientKey } from "../../theme/phi-theme-gradients";
import type { PhiControlOption } from "./phi-control-options";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";

export type PhiSegmentedControlProps<TValue extends string | number = string> = {
  /**
   * `undefined` leaves the Segmented to itself, which selects its first option. `null` selects none:
   * the value is stated, and it matches no option.
   */
  value?: TValue | null;
  label?: string;
  options: readonly PhiControlOption<TValue>[];
  disabled?: boolean;
  readOnly?: boolean;
  block?: boolean;
  size?: PhiControlSize;
  /** A Theme gradient slot the selected segment is filled with; its words take the slot's text colour. */
  gradient?: PhiThemeGradientKey;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (value: TValue) => void;
};

export function PhiSegmentedControl<TValue extends string | number = string>({
  value,
  label,
  options,
  disabled,
  readOnly,
  block,
  size,
  gradient,
  onFocus,
  onBlur,
  onChange,
}: PhiSegmentedControlProps<TValue>) {
  const { labelId, labelledBy } = usePhiControlLabel(label);
  const gradientVars = gradient ? PHI_THEME_GRADIENT_CSS_VARS[gradient] : null;
  const control = (
    <Segmented
      aria-labelledby={labelledBy}
      block={block}
      value={value as TValue | undefined}
      disabled={disabled || readOnly || !onChange}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled,
        /*
         * No browser tooltip: left out, the Segmented writes the label into `title` and every segment
         * repeats its own text on hover. What a segment has to say beyond its label is its description,
         * shown as a real tooltip.
         */
        title: "",
        tooltip: option.description || undefined,
      }))}
      size={size}
      onChange={(nextValue) => onChange?.(nextValue as TValue)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={gradientVars ? "phi-segmented-gradient" : undefined}
      style={{
        minWidth: 0,
        width: block ? "100%" : undefined,
        ...(gradientVars
          ? {
              "--phi-control-gradient": `var(${gradientVars.paint})`,
              "--phi-control-gradient-text": `var(${gradientVars.text})`,
            } as CSSProperties
          : {}),
      }}
    />
  );

  return <PhiLabeledControl label={label} labelId={labelId} fill={block}>{control}</PhiLabeledControl>;
}
