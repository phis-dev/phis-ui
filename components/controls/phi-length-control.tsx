"use client";

import { InputNumber, Select, Space } from "antd";
import { useState, type CSSProperties } from "react";

import {
  PHI_CSS_LENGTH_UNITS,
  readPhiCssLengthPart,
  serializePhiCssLength,
  type PhiControlSize,
  type PhiCssLength,
  type PhiCssLengthUnit,
} from "../../types";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiLengthControlProps = {
  value?: PhiCssLength | null;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  readOnly?: boolean;
  size?: PhiControlSize;
  style?: CSSProperties;
  /**
   * Where the unit list mounts. Inside another popup it has to mount within that popup's own DOM, or
   * the click that picks a unit counts as a click outside the popup and closes it.
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  onChange?: (value: PhiCssLength | null) => void;
};

export function PhiLengthControl({
  value,
  label,
  placeholder,
  min,
  max,
  step,
  precision,
  disabled = false,
  readOnly = false,
  size,
  style,
  getPopupContainer,
  onChange,
}: PhiLengthControlProps) {
  const part = readPhiCssLengthPart(value);
  /**
   * A unit is only expressible together with a number, so an empty field would otherwise force the
   * author to type a pixel value first and correct the unit afterwards. The chosen unit is held until
   * a number arrives to carry it.
   */
  const [pendingUnit, setPendingUnit] = useState<PhiCssLengthUnit | null>(null);
  const unit = part?.unit ?? pendingUnit ?? "px";
  const controlDisabled = disabled || readOnly || !onChange;
  const control = (
    <Space.Compact block size={size} style={{ width: "100%", minWidth: 0, ...style }}>
      <InputNumber
        aria-label={placeholder ?? label ?? "Length"}
        controls={false}
        disabled={controlDisabled}
        min={min}
        max={max}
        step={step}
        precision={precision}
        placeholder={placeholder}
        value={part?.value ?? null}
        style={{ flex: "1 1 0", minWidth: 0 }}
        onChange={(nextValue) => onChange?.(
          typeof nextValue === "number" ? serializePhiCssLength(nextValue, unit) : null,
        )}
      />
      <Select<PhiCssLengthUnit>
        aria-label={`${placeholder ?? label ?? "Length"} unit`}
        disabled={controlDisabled}
        options={PHI_CSS_LENGTH_UNITS.map((option) => ({ value: option, label: option }))}
        popupMatchSelectWidth={false}
        getPopupContainer={getPopupContainer}
        showSearch={false}
        suffixIcon={null}
        variant="filled"
        value={unit}
        style={{ flex: "0 0 38px", width: 38 }}
        styles={{
          root: { paddingInline: 4 },
          content: { justifyContent: "center", textAlign: "center" },
        }}
        onChange={(nextUnit) => {
          setPendingUnit(nextUnit);
          if (part) {
            onChange?.(serializePhiCssLength(part.value, nextUnit));
          }
        }}
      />
    </Space.Compact>
  );

  return <PhiLabeledControl label={label} fill>{control}</PhiLabeledControl>;
}
