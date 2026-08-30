"use client";

import { Skeleton } from "antd";
import type { ReactNode } from "react";

import type { PhiControlSize } from "../../types/control";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiCollectionHeaderControl } from "./phi-collection-header-control";
import { PhiCollectionLayoutControl } from "./phi-collection-layout-control";
import { PhiPaginationControl } from "./phi-pagination-control";

export type PhiCollectionViewControlProps = {
  title?: ReactNode;
  description?: ReactNode;
  filters?: ReactNode;
  toolbar?: ReactNode;
  panel?: ReactNode;
  diagnostics?: ReactNode;
  body?: ReactNode;
  items?: readonly ReactNode[];
  mode?: "grid" | "masonry" | "stack";
  gap?: string | number;
  minColumnWidth?: string | number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    simple?: boolean;
    showSizeChanger?: boolean;
    size?: PhiControlSize;
    onChange: (page: number, pageSize: number) => void;
  } | null;
};

export function PhiCollectionViewControl({
  title,
  description,
  filters,
  toolbar,
  panel,
  diagnostics,
  body,
  items,
  mode = "grid",
  gap,
  minColumnWidth,
  pagination,
}: PhiCollectionViewControlProps) {
  const { token } = usePhiConfig();
  const resolvedGap = gap ?? token.paddingSM;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: token.paddingSM, width: "100%", minWidth: 0 }}>
      <PhiCollectionHeaderControl title={title} description={description} filters={filters} toolbar={toolbar} />
      {panel}
      {diagnostics}
      {body ?? (
        <PhiCollectionLayoutControl
          mode={mode}
          gap={resolvedGap}
          minColumnWidth={minColumnWidth ?? 102}
          items={[...(items ?? [])]}
        />
      )}
      {pagination ? (
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", minWidth: 0 }}>
          <PhiPaginationControl
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            simple={pagination.simple}
            showSizeChanger={pagination.showSizeChanger}
            size={pagination.size}
            onChange={(value) => pagination.onChange(value.page, value.pageSize)}
          />
        </div>
      ) : null}
    </div>
  );
}

export function PhiCollectionViewSkeletonControl({
  mode = "grid",
  gap,
  minColumnWidth,
  active = true,
  count = 8,
}: Pick<PhiCollectionViewControlProps, "mode" | "gap" | "minColumnWidth"> & {
  active?: boolean;
  count?: number;
}) {
  const { token } = usePhiConfig();
  return (
    <PhiCollectionLayoutControl
      mode={mode}
      gap={gap ?? token.paddingSM}
      minColumnWidth={minColumnWidth ?? 102}
      items={Array.from({ length: count }, (_, index) => (
        <Skeleton.Node key={index} active={active} style={{ width: "100%", minHeight: token.controlHeight * 3 }} />
      ))}
    />
  );
}
