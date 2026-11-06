"use client";

import { Progress } from "antd";
import type { ProgressProps } from "antd";

import { PHI_THEME_GRADIENT_CSS_VARS, type PhiThemeGradientKey } from "../../theme/phi-theme-gradients";

/**
 * How far along something is.
 *
 * A pass-through. All four sites render an upload percentage -- three as a small bar beside the file,
 * one as a circle in the upload wall -- and `percent`, `size` and `type` are the whole of what they
 * ask for.
 *
 * It was tempting to cut this narrower, as `PhiFileDropControl` beside it is cut: an upload-specific
 * control with `percent` and a `shape` of line or circle. That would have been inventing props. Nothing
 * about a percentage is specific to uploading, and the next caller that shows one of something else
 * would have had to widen it or write a second one.
 */
export type PhiProgressControlProps = ProgressProps & {
  /**
   * A Theme gradient slot the bar is filled with. A line bar only: Ant Design paints a line's stroke as a
   * CSS background, which takes the slot's custom property, while a circle draws an SVG stroke that can
   * take a colour only -- there the bar keeps the colour it is given.
   */
  gradient?: PhiThemeGradientKey;
};

export function PhiProgressControl({ gradient, ...props }: PhiProgressControlProps) {
  const lineGradient = gradient && (props.type ?? "line") === "line"
    ? `var(${PHI_THEME_GRADIENT_CSS_VARS[gradient].paint})`
    : undefined;
  return <Progress {...props} {...(lineGradient ? { strokeColor: lineGradient } : {})} />;
}
