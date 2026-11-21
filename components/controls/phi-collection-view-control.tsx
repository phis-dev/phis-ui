"use client";

import { lazy, Suspense, type ReactNode } from "react";

import type { PhiControlSize } from "../../types/control";
import { PHI_VISUAL_ANCHOR_PART_ATTRIBUTE } from "../../types/visual-anchors";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiCollectionHeaderControl } from "./phi-collection-header-control";
import { PhiCollectionLayoutControl } from "./phi-collection-layout-control";
import { PhiPaginationControl } from "./phi-pagination-control";
import { PhiSkeletonControl } from "./phi-skeleton-control";
import { usePhiCollectionReorder } from "./phi-collection-reorder-context";

// Loaded where a Collection offers reordering, so a Collection that does not carries no drag code.
const PhiCollectionSortableLayoutControl = lazy(() =>
  import("./phi-collection-sortable-layout-control").then((module) => ({ default: module.PhiCollectionSortableLayoutControl })));

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
    pageSizeOptions?: readonly number[];
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
  /*
   * Reordering offered around this Collection (`PhiCollectionReorderContext`, the `collection-view`
   * Widget's `features.reorder`) puts a handle on each item, in grid and stack. Only where the items are
   * the ones the keys name -- one each, the renderer's own `body` not in their place.
   */
  const reorder = usePhiCollectionReorder();
  const itemList = [...(items ?? [])];
  const sortable = reorder != null && body == null && mode !== "masonry" && itemList.length > 0 &&
    itemList.length === reorder.itemKeys.length;
  const layout = (
    <PhiCollectionLayoutControl
      mode={mode}
      gap={resolvedGap}
      minColumnWidth={minColumnWidth ?? 102}
      items={itemList}
    />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: token.paddingSM, width: "100%", minWidth: 0 }}>
      <PhiCollectionHeaderControl title={title} description={description} filters={filters} toolbar={toolbar} />
      {panel}
      {diagnostics}
      <div {...{ [PHI_VISUAL_ANCHOR_PART_ATTRIBUTE]: "items" }} style={{ width: "100%", minWidth: 0 }}>
        {body ?? (sortable ? (
          <Suspense fallback={layout}>
            <PhiCollectionSortableLayoutControl
              mode={mode === "stack" ? "stack" : "grid"}
              gap={resolvedGap}
              minColumnWidth={minColumnWidth ?? 102}
              items={itemList}
              reorder={reorder}
            />
          </Suspense>
        ) : layout)}
      </div>
      {pagination ? (
        <div
          {...{ [PHI_VISUAL_ANCHOR_PART_ATTRIBUTE]: "pagination" }}
          style={{ display: "flex", justifyContent: "flex-end", width: "100%", minWidth: 0 }}
        >
          <PhiPaginationControl
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            simple={pagination.simple}
            showSizeChanger={pagination.showSizeChanger}
            pageSizeOptions={pagination.pageSizeOptions}
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
        <PhiSkeletonControl presentation="node" key={index} active={active} style={{ width: "100%", minHeight: token.controlHeight * 3 }} />
      ))}
    />
  );
}
