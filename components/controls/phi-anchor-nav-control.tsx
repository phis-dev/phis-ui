"use client";

import type { CSSProperties, ReactNode } from "react";
import { Anchor } from "antd";

export type PhiAnchorNavControlItem = {
  key: string;
  /** The in-page target, `#id`. */
  href: string;
  title: ReactNode;
};

export type PhiAnchorNavControlProps = {
  items: readonly PhiAnchorNavControlItem[];
  /** How far below the top of the scroll container a target counts as reached. */
  offsetTop?: number;
  style?: CSSProperties;
};

/**
 * Links to places on the same page, with the one currently in view marked.
 *
 * Not the anchor of a Widget's placement (`phi-anchor-control-contract`): this is navigation inside a
 * page, the shape a table of contents takes. It stays where it is drawn and never pins itself.
 */
export function PhiAnchorNavControl({ items, offsetTop = 0, style }: PhiAnchorNavControlProps) {
  return <Anchor affix={false} offsetTop={offsetTop} items={[...items]} style={style} />;
}
