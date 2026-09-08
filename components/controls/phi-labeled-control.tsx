"use client";

import type { ReactNode } from "react";
import { Tooltip, Typography } from "antd";

import { usePhiConfig } from "../root/phi-config-provider";
import { PHI_DESCRIPTION_TOOLTIP_ICON } from "./phi-description-tooltip-icon";

export function PhiLabeledControl({
  label,
  description,
  children,
  fill = false,
}: {
  label?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}) {
  const { token } = usePhiConfig();
  const hasLabel = label != null && label !== "";
  const hasDescription = description != null && description !== "";

  if (!hasLabel && !hasDescription) {
    return children;
  }

  if (!hasLabel) {
    return (
      <Tooltip title={description}>
        <span style={{ display: "inline-flex", minWidth: 0, width: fill ? "100%" : undefined }}>
          {children}
        </span>
      </Tooltip>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--phi-labeled-control-label-width, max-content) minmax(0, 1fr)",
        alignItems: "center",
        columnGap: token.paddingXS,
        minWidth: 0,
        /*
         * A form makes its rows the same width; anywhere else the row is as wide as it needs to be.
         *
         * `auto` is what a labelled Control has always been, and inside a flex column that means
         * shrink-to-fit -- which is why two rows in a form would otherwise sit at two label widths.
         * The form layout sets both variables, so a Control still knows nothing about forms.
         */
        width: fill ? "100%" : "var(--phi-labeled-control-width, auto)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: token.paddingXXS, minWidth: 0 }}>
        <Typography.Text ellipsis style={{ minWidth: 0, whiteSpace: "nowrap" }}>
          {label}
        </Typography.Text>
        {hasDescription ? (
          <Tooltip title={description}>
            <span
              role="img"
              aria-label={typeof description === "string" ? description : "Information"}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              {PHI_DESCRIPTION_TOOLTIP_ICON}
            </span>
          </Tooltip>
        ) : null}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifySelf: fill ? "stretch" : "start",
          minWidth: 0,
          width: fill ? "100%" : "fit-content",
        }}
      >
        {children}
      </div>
    </div>
  );
}
