"use client";

import type { CSSProperties, ReactNode } from "react";
import { Collapse, type CollapseProps } from "antd";

import type { PhiControlSize } from "../../types/control";

/**
 * Sections that fold, each on its own or one at a time -- the whole surface the CollapsibleLayout needs.
 *
 * PhiAccordionControl is the narrow case (one open, nothing to decide); this is the wide one, and it is
 * a Control so that the Layout describes sections and the primitive stays in this folder.
 *
 * It is controlled: the Layout keeps the open keys where they survive a reload and travel as a signal,
 * and a Control keeping its own would be a second answer to the same question.
 */
export type PhiCollapseControlSection = {
  key: string;
  label: ReactNode;
  children: ReactNode;
  /** Render the body while folded, so what is inside keeps running. */
  forceRender?: boolean;
  /** Kept mounted and off the screen, rather than dropped. */
  hidden?: boolean;
};

export type PhiCollapseControlProps = {
  sections: readonly PhiCollapseControlSection[];
  /** The open sections. With `accordion` only the first counts. */
  openKeys: readonly string[];
  onOpenKeysChange?: (keys: string[]) => void;
  accordion?: boolean;
  /** What folds a section: its whole header, only the icon, or nothing. */
  collapsible?: "header" | "icon" | "disabled";
  /** No ground of its own for headers and bodies. */
  ghost?: boolean;
  expandIconPlacement?: "start" | "end";
  size?: PhiControlSize;
  /**
   * A class for every header element, owned by the caller. Code that has to tell a header click from
   * another click tests this name rather than one the primitive happens to use.
   */
  headerClassName?: string;
  headerPadding?: CSSProperties["padding"];
  bodyPadding?: CSSProperties["padding"];
  titleStrong?: boolean;
  style?: CSSProperties;
};

/*
 * The grounds are square, because they are not an edge.
 *
 * A header and a body are the filling of whatever box the caller stands them in, and that box has
 * already decided its corner. Rounding them a second time means the same number in two places, which
 * drifts apart the moment one of the two gains a source the other does not have. Square, the caller's
 * clip is the only corner there is.
 */
function resolveSectionStyles(
  titleStrong: boolean,
  headerPadding: CSSProperties["padding"] | undefined,
  bodyPadding: CSSProperties["padding"] | undefined,
): CollapseProps["styles"] {
  return {
    header: { ...(headerPadding == null ? {} : { padding: headerPadding }), borderRadius: 0 },
    title: titleStrong ? { fontWeight: 600 } : undefined,
    body: { ...(bodyPadding == null ? {} : { padding: bodyPadding }), borderRadius: 0 },
  };
}

export function PhiCollapseControl({
  sections,
  openKeys,
  onOpenKeysChange,
  accordion = false,
  collapsible = "header",
  ghost = false,
  expandIconPlacement = "start",
  size,
  headerClassName,
  headerPadding,
  bodyPadding,
  titleStrong = false,
  style,
}: PhiCollapseControlProps) {
  return (
    <Collapse
      accordion={accordion}
      activeKey={accordion ? openKeys[0] ?? undefined : [...openKeys]}
      // The caller's box draws the outline; what stays here is `ghost`, which decides the inside.
      bordered={false}
      ghost={ghost}
      collapsible={collapsible}
      destroyOnHidden={false}
      expandIconPlacement={expandIconPlacement}
      size={size}
      classNames={headerClassName ? { header: headerClassName } : undefined}
      items={sections.map((section) => ({
        key: section.key,
        label: section.label,
        collapsible,
        forceRender: section.forceRender,
        ...(section.hidden ? { style: { display: "none" } } : {}),
        children: section.children,
      }))}
      onChange={(next) => onOpenKeysChange?.(Array.isArray(next) ? next : next ? [next] : [])}
      styles={resolveSectionStyles(titleStrong, headerPadding, bodyPadding)}
      style={style}
    />
  );
}
