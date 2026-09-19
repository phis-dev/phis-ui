"use client";

import type { ReactNode } from "react";
import { Tooltip, Typography } from "antd";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiDescriptionHint } from "./phi-description-tooltip-icon";

/**
 * A Control with the words around it: a label beside it, a description behind an information glyph.
 *
 * **A description without a label is the hover text on its own**, and that is the shape to reach for
 * when a Control shows no words but still has to say what it is -- a colour swatch, one cell of a
 * padding grid. It is not a second way to write a tooltip: the Control inside still names itself with
 * its own `aria-label`, because an accessible name cannot be handed to a child from outside it. A
 * graphic that has no name of its own is `PhiNameControl` instead, which renders the named element and
 * can therefore give it both from one string.
 */
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
        {hasDescription ? <PhiDescriptionHint description={description} /> : null}
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
