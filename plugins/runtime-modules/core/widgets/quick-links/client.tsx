"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";
import { Flex, Typography } from "antd";

import { PhiLink } from "../../../../../components/navigation/phi-link";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import type { PhiClientBlockBaseProps } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import {
  PHI_CONTAINER_BREAKPOINT_COL2,
  PHI_CONTAINER_BREAKPOINT_COL3,
} from "../../../../../theme/phi-container-breakpoints";

export type PhiQuickLinksWidgetItem = {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
  newTab?: boolean;
};

export type PhiQuickLinksWidgetClientLabels = {
  title?: string;
};

export type PhiQuickLinksWidgetClientConfig = {
  columns?: 1 | 2 | 3;
  separator?: boolean;
  interactive?: boolean;
  items: PhiQuickLinksWidgetItem[];
};

export type PhiQuickLinksWidgetClientProps = PhiClientBlockBaseProps<
  PhiQuickLinksWidgetClientLabels,
  PhiQuickLinksWidgetClientConfig
>;

function useQuickLinksContainerWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const breakpoints = {
    col2: PHI_CONTAINER_BREAKPOINT_COL2,
    col3: PHI_CONTAINER_BREAKPOINT_COL3,
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width, breakpoints };
}

function groupQuickLinksItems(items: PhiQuickLinksWidgetItem[], columns: 1 | 2 | 3) {
  const resolvedColumnCount = Math.min(columns, Math.max(1, items.length));
  const groups = Array.from({ length: resolvedColumnCount }, () => [] as PhiQuickLinksWidgetItem[]);
  const baseSize = Math.floor(items.length / resolvedColumnCount);
  const remainder = items.length % resolvedColumnCount;

  let cursor = 0;
  for (let columnIndex = 0; columnIndex < resolvedColumnCount; columnIndex += 1) {
    const size = baseSize + (columnIndex < remainder ? 1 : 0);
    groups[columnIndex] = items.slice(cursor, cursor + size);
    cursor += size;
  }

  return groups.filter((group) => group.length > 0);
}

export function PhiQuickLinksWidgetClient({
  labels,
  config,
}: PhiQuickLinksWidgetClientProps) {
  const { token } = usePhiConfig();
  const { Text } = Typography;
  const { ref, width, breakpoints } = useQuickLinksContainerWidth();
  const pathname = usePathname() ?? "/";

  const maxColumns = config?.columns === 1 || config?.columns === 3 ? config.columns : 2;
  const interactive = config?.interactive !== false;
  const items = config?.items ?? [];
  const effectiveColumnsByWidth =
    width >= breakpoints.col3 ? 3 : width >= breakpoints.col2 ? 2 : 1;
  const effectiveColumns =
    maxColumns === 1
      ? 1
      : maxColumns === 2
        ? Math.min(effectiveColumnsByWidth, 2) as 1 | 2
        : effectiveColumnsByWidth;
  const groupedItems = groupQuickLinksItems(items, effectiveColumns);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={ref} style={{ width: "100%", minWidth: 0 }}>
      <Flex vertical style={{ width: "100%", minWidth: 0, gap: token.paddingLG }}>
      {labels.title ? (
        <Text
          strong
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            color: "inherit",
            fontSize: token.fontSizeLG,
            lineHeight: token.lineHeightLG,
          }}
        >
          {labels.title}
        </Text>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${groupedItems.length}, minmax(0, 1fr))`,
          width: "100%",
          minWidth: 0,
        }}
      >
        {groupedItems.map((group, groupIndex) => (
          <Flex
            key={`column-${groupIndex}`}
            vertical
            style={{
              width: "100%",
              minWidth: 0,
              gap: token.paddingSM,
              paddingInlineStart: groupIndex === 0 ? 0 : token.paddingMD,
              paddingInlineEnd: groupIndex === groupedItems.length - 1 ? 0 : token.paddingMD,
              borderInlineEnd:
                config?.separator && groupIndex < groupedItems.length - 1
                  ? `1px solid ${token.colorSplit}`
                  : undefined,
              boxSizing: "border-box",
            }}
          >
            {group.map((item, index) => (
              (() => {
                const isCurrent = !item.external && item.href === pathname;
                const content = (
                  <Flex align="center" style={{ minWidth: 0, gap: token.paddingSM }}>
                    {item.icon ? <PhiIcon name={item.icon} /> : null}
                    <span>{item.label}</span>
                  </Flex>
                );

                if (isCurrent || !interactive) {
                  return (
                    <span
                      key={`${item.href}-${groupIndex}-${index}`}
                      style={{
                        color: isCurrent ? token.colorLinkActive : "inherit",
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        minWidth: 0,
                        cursor: "default",
                      }}
                    >
                      {content}
                    </span>
                  );
                }

                return (
                  <PhiLink
                    key={`${item.href}-${groupIndex}-${index}`}
                    href={item.href}
                    external={item.external}
                    newTab={item.newTab}
                    style={{
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    {content}
                  </PhiLink>
                );
              })()
            ))}
          </Flex>
        ))}
      </div>
      </Flex>
    </div>
  );
}
