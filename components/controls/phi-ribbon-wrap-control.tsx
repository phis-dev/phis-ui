"use client";

import Ribbon from "antd/es/badge/Ribbon";
import type { CSSProperties, ReactNode } from "react";

export type PhiRibbonWrapControlProps = {
  /** The box the ribbon hangs on. */
  children: ReactNode;
  /** The ribbon's words. */
  text: ReactNode;
  /** The ribbon's ground; absent, the Theme's primary. The fold under it is a darker shade of it. */
  color?: string;
  /** Takes the pointer, for an editor that writes in the ribbon; otherwise clicks pass to the box. */
  interactive?: boolean;
  className?: string;
};

/**
 * A ribbon that hangs over a box's end edge, with a fold behind it: Ant Design's `Badge.Ribbon`.
 *
 * The other band, `PhiRibbonControl`, stands inside the box and needs nothing from it. This one reaches
 * past the box's edge, which a box that clips -- a card does, for its picture's corners and its zoom --
 * cannot give a child of its own. So it wraps the box: the wrapper does not clip, the box keeps clipping
 * what is its own, and the ribbon is the box's sibling. The wrapper is a column that passes the slot's
 * width and height on to the box. Whatever stands around the wrapper must leave the overhang room: a
 * Layout that clips at the box's edge cuts the ribbon off as it would any overhang.
 *
 * Imported from its own module, not from `antd`'s Badge: the Badge brings its scroll-number motion along,
 * which a ribbon never uses.
 */
export function PhiRibbonWrapControl({ children, text, color, interactive = false, className }: PhiRibbonWrapControlProps) {
  const indicator: CSSProperties = interactive ? { zIndex: 4 } : { zIndex: 4, pointerEvents: "none" };
  /*
   * An editor's field in the ribbon measures itself against the ribbon, which is as wide as its words:
   * empty, both were nothing, and only the fold showed. Room for a word, as the inner band keeps it.
   */
  const content: CSSProperties | undefined = interactive ? { display: "inline-block", minWidth: "6em" } : undefined;
  return (
    <Ribbon
      text={text}
      {...(color ? { color } : {})}
      rootClassName={["phi-ribbon-wrap-control", className].filter(Boolean).join(" ")}
      styles={{ indicator, ...(content ? { content } : {}) }}
    >
      {children}
    </Ribbon>
  );
}
