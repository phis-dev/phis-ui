"use client";

import { Progress } from "antd";
import type { ProgressProps } from "antd";

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
export type PhiProgressControlProps = ProgressProps;

export function PhiProgressControl(props: PhiProgressControlProps) {
  return <Progress {...props} />;
}
