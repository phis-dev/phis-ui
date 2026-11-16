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
 * Tells the page about a jump the way a link to `#id` would.
 *
 * Ant Design scrolls to the place itself and writes the address with `history.pushState`, which fires no
 * `hashchange` -- so whatever opens on its fragment (a folded section, `markdown-body-client.tsx`) never
 * heard of the jump and the reader landed on a closed question. Sent once the address is written, after
 * the click. It is not the browser's event (`isTrusted` is false): a listener reads that the scroll is
 * this Control's and leaves it alone.
 */
function announcePhiInPageJump(oldURL: string) {
  queueMicrotask(() => {
    const newURL = window.location.href;
    if (newURL !== oldURL) {
      window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL, newURL }));
    }
  });
}

/**
 * Links to places on the same page, with the one currently in view marked.
 *
 * Not the anchor of a Widget's placement (`phi-anchor-control-contract`): this is navigation inside a
 * page, the shape a table of contents takes. It stays where it is drawn and never pins itself.
 */
export function PhiAnchorNavControl({ items, offsetTop = 0, style }: PhiAnchorNavControlProps) {
  return (
    <Anchor
      affix={false}
      offsetTop={offsetTop}
      items={[...items]}
      onClick={() => announcePhiInPageJump(window.location.href)}
      className="phi-anchor-nav-control"
      // As wide as its slot and no wider: Ant Design sizes the list to its longest title, which in a
      // narrow sider ran past the edge. Within the slot a long title ends in an ellipsis, Ant Design's own.
      style={{ maxWidth: "100%", minWidth: 0, ...style }}
    />
  );
}
