"use client";

import { Tooltip, Typography } from "antd";
import type { ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PHI_DESCRIPTION_TOOLTIP_ICON } from "./phi-description-tooltip-icon";

export type PhiCollectionHeaderControlProps = {
  title?: ReactNode;
  description?: ReactNode;
  filters?: ReactNode;
  toolbar?: ReactNode;
};

export function PhiCollectionHeaderControl({
  title,
  description,
  filters,
  toolbar,
}: PhiCollectionHeaderControlProps) {
  const { token } = usePhiConfig();
  const hasTitle = title !== undefined && title !== null && title !== "";
  const hasFilters = filters !== undefined && filters !== null;
  const hasToolbar = toolbar !== undefined && toolbar !== null;

  if (!hasTitle && !hasFilters && !hasToolbar) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: token.paddingSM,
        width: "100%",
        minWidth: 0,
      }}
    >
      {hasTitle ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: token.paddingXXS,
            flex: "0 1 auto",
            minWidth: 0,
          }}
        >
          <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
            {title}
          </Typography.Text>
          {description ? (
            <Tooltip title={description}>
              <span
                role="img"
                aria-label="Information"
                tabIndex={0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  color: token.colorTextSecondary,
                  cursor: "help",
                  flex: "none",
                }}
              >
                {PHI_DESCRIPTION_TOOLTIP_ICON}
              </span>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      {hasFilters ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            flex: "1 1 280px",
            flexWrap: "wrap",
            gap: token.paddingSM,
            minWidth: 0,
          }}
        >
          {filters}
        </div>
      ) : hasTitle && hasToolbar ? <span aria-hidden style={{ flex: "1 1 auto" }} /> : null}
      {hasToolbar ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            marginInlineStart: "auto",
            flex: "0 0 auto",
          }}
        >
          {toolbar}
        </div>
      ) : null}
    </div>
  );
}
