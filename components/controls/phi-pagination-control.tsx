"use client";

import { lazy, Suspense } from "react";

import type { PhiControlSize } from "../../types/control";
import { usePhiConfig } from "../root/phi-config-provider";

export type PhiPaginationControlValue = {
  page: number;
  pageSize: number;
  total: number;
};

export type PhiPaginationControlProps = PhiPaginationControlValue & {
  disabled?: boolean;
  readOnly?: boolean;
  simple?: boolean;
  showSizeChanger?: boolean;
  /**
   * The page sizes the changer offers, instead of antd's own 10/20/50/100.
   *
   * The current `pageSize` is appended by antd when it is not among them, so a Site cannot configure a
   * changer that cannot show where it stands.
   */
  pageSizeOptions?: readonly number[];
  size?: PhiControlSize;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  popupRootClassName?: string;
  onPopupOpenChange?: (open: boolean) => void;
  onChange?: (value: PhiPaginationControlValue) => void;
};

const PhiPaginationControlAdapter = lazy(() =>
  import("./phi-pagination-control-adapter")
    .then((module) => ({ default: module.PhiPaginationControlAdapter })));

/** The pager. Until the primitive has loaded, its row is held at the height it will take. */
export function PhiPaginationControl(props: PhiPaginationControlProps) {
  const { token } = usePhiConfig();
  const height = props.size === "small"
    ? token.controlHeightSM
    : props.size === "large" ? token.controlHeightLG : token.controlHeight;
  return (
    <Suspense fallback={<div style={{ minHeight: height }} />}>
      <PhiPaginationControlAdapter {...props} />
    </Suspense>
  );
}
