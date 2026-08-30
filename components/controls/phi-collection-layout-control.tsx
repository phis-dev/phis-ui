"use client";

import type { ReactNode } from "react";
import { Flex } from "antd";

export type PhiCollectionLayoutControlProps = {
  mode: "grid" | "masonry" | "stack";
  gap: string | number;
  minColumnWidth: string | number;
  items: ReactNode[];
};

function buildGridColumns(minColumnWidth: string | number) {
  const width = typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth;
  return `repeat(auto-fill, minmax(${width}, 1fr))`;
}

export function PhiCollectionLayoutControl({
  mode,
  gap,
  minColumnWidth,
  items,
}: PhiCollectionLayoutControlProps) {
  if (mode === "masonry") {
    return (
      <div
        style={{
          width: "100%",
          columnWidth: minColumnWidth,
          columnGap: gap,
          columnFill: "balance",
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: "inline-block",
              width: "100%",
              minWidth: 0,
              breakInside: "avoid",
              pageBreakInside: "avoid",
              marginBottom: gap,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (mode === "stack") {
    return (
      <Flex vertical gap={gap} style={{ width: "100%" }}>
        {items}
      </Flex>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: buildGridColumns(minColumnWidth),
        gap,
        width: "100%",
      }}
    >
      {items}
    </div>
  );
}
