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
      showSizeChanger={showSizeChanger ? {
        getPopupContainer,
        classNames: popupRootClassName ? { popup: { root: popupRootClassName } } : undefined,
        onOpenChange: onPopupOpenChange,
      } : false}
      onChange={(nextPage, nextPageSize) => onChange?.({ page: nextPage, pageSize: nextPageSize, total })}
    />
  );
}
