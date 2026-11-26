"use client";

import type { CSSProperties } from "react";

import type { PhiControlSize } from "../../types/control";
import { readPhiLengthValue, type PhiCssLength } from "../../types/length";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import { PhiLengthControl } from "./phi-length-control";
import { PHI_SPACE } from "../../theme/antd-css-var-contract";

export type PhiDimensionControlProps = {
  value?: PhiRenderableBlockSize | null;
  /** The accessible name of the pair; each field keeps its own, its placeholder. */
  ariaLabel?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (nextValue: PhiRenderableBlockSize | null) => void;
  widthPlaceholder?: string;
  heightPlaceholder?: string;
  size?: PhiControlSize;
  style?: CSSProperties;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
};

function resolveNextSize(
  currentSize: PhiRenderableBlockSize | undefined,
  key: "width" | "height",
  value: PhiCssLength | null,
) {
  const nextSize: PhiRenderableBlockSize = {
    ...(currentSize ?? {}),
    [key]: value ?? undefined,
  };

  if (nextSize.width == null && nextSize.height == null) {
    return null;
  }

  return nextSize;
}

export function PhiDimensionControl({
  value,
  ariaLabel,
  disabled = false,
  readOnly = false,
  onChange,
  widthPlaceholder = "Width",
  heightPlaceholder = "Height",
  size,
  style,
  getPopupContainer,
}: PhiDimensionControlProps) {
  const currentSize = value ?? null;
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        /*
         * The narrowest step in the vocabulary, because width and height are one measurement in two
         * fields: they belong closer together than two fields of a form do, and the gap that says so is
         * a named step rather than a number picked at the time.
         */
        gap: PHI_SPACE.xxs,
        width: "100%",
        minWidth: 0,
        ...style,
      }}
    >
      <PhiLengthControl
        value={readPhiLengthValue(currentSize?.width)}
        min={0}
        placeholder={widthPlaceholder}
        disabled={disabled}
        readOnly={readOnly}
        size={size}
        getPopupContainer={getPopupContainer}
        onChange={onChange ? (nextValue) => onChange(resolveNextSize(currentSize ?? undefined, "width", nextValue)) : undefined}
      />
      <PhiLengthControl
        value={readPhiLengthValue(currentSize?.height)}
        min={0}
        placeholder={heightPlaceholder}
        disabled={disabled}
        readOnly={readOnly}
        size={size}
        getPopupContainer={getPopupContainer}
        onChange={onChange ? (nextValue) => onChange(resolveNextSize(currentSize ?? undefined, "height", nextValue)) : undefined}
      />
    </div>
  );
}
