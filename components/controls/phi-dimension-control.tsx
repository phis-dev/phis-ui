"use client";

import type { CSSProperties } from "react";

import {
  readPhiLengthValue,
  type PhiControlSize,
  type PhiCssLength,
  type PhiRenderableBlockSize,
} from "../../types";
import { PhiLengthControl } from "./phi-length-control";

export type PhiDimensionControlProps = {
  value?: PhiRenderableBlockSize | null;
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
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 4,
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
