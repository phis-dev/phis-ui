"use client";

import type { ReactNode } from "react";
import { Result } from "antd";

import type { PhiResultWidgetVisualStatus } from "../../types/result-widget";

export type PhiResultControlProps = {
  status: PhiResultWidgetVisualStatus;
  title: ReactNode;
  subTitle?: ReactNode;
  /** What the reader can do next, drawn under the message -- usually one button. */
  extra?: ReactNode;
};

/**
 * The end of a journey on a page: an outcome, what happened, and what to do now.
 *
 * The status picks the illustration; the words are the caller's.
 */
export function PhiResultControl({ status, title, subTitle, extra }: PhiResultControlProps) {
  return <Result status={status} title={title} subTitle={subTitle} extra={extra} />;
}
