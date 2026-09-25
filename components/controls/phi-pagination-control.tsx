"use client";

import { Pagination } from "antd";
import type { PhiControlSize } from "../../types/control";

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

export function PhiPaginationControl({
  page,
  pageSize,
  total,
  disabled = false,
  readOnly = false,
  simple,
  showSizeChanger,
  pageSizeOptions,
  size,
  getPopupContainer,
  popupRootClassName,
  onPopupOpenChange,
  onChange,
}: PhiPaginationControlProps) {
  return (
    <Pagination
      current={page}
      pageSize={pageSize}
      total={total}
      disabled={disabled || readOnly}
      simple={simple}
      size={size}
      pageSizeOptions={pageSizeOptions ? [...pageSizeOptions] : undefined}
      showSizeChanger={showSizeChanger ? {
        getPopupContainer,
        classNames: popupRootClassName ? { popup: { root: popupRootClassName } } : undefined,
        onOpenChange: onPopupOpenChange,
      } : false}
      onChange={(nextPage, nextPageSize) => onChange?.({ page: nextPage, pageSize: nextPageSize, total })}
    />
  );
}
