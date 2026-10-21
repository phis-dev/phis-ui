"use client";

/*
 * Ant Design's Pagination, behind `PhiPaginationControl`, which loads this file where a list is drawn
 * page by page. A Collection that shows everything at once -- a Dashboard's cards, a short Entry list --
 * would otherwise carry the pager, its size changer and its Select all the same.
 */

import { Pagination } from "antd";

import type { PhiPaginationControlProps } from "./phi-pagination-control";

export function PhiPaginationControlAdapter({
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
