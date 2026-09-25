"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tag } from "antd";

export type PhiTagControlProps = {
  children: ReactNode;
  color?: string;
  variant?: "filled" | "outlined" | "solid";
  /**
   * Offers the remove affordance Ant Design draws inside the capsule.
   *
   * `closable` rather than Ant Design's `closeIcon`, because what a caller decides here is whether the
   * tag can be removed at all and not which glyph says so. A caller that wants its own glyph has not
   * appeared; when one does, this is the prop that grows an overload rather than the callers that reach
   * past the Control.
   */
  closable?: boolean;
  /**
   * What removal means, which is never "hide the tag".
   *
   * Ant Design hides a closed tag by itself unless the event is prevented, which is the wrong answer
   * wherever the list of tags is drawn from a value: the value would still hold the entry and the next
   * render would bring the tag back. So the default is prevented here and the tag disappears because
   * the caller removed the thing, not because the tag was clicked.
   */
  onClose?: () => void;
  style?: CSSProperties;
};

export function PhiTagControl({
  children,
  color,
  variant = "outlined",
  closable,
  onClose,
  style,
}: PhiTagControlProps) {
  return (
    <Tag
      color={color}
      variant={variant}
      closeIcon={closable || undefined}
      onClose={onClose ? (event) => {
        event.preventDefault();
        onClose();
      } : undefined}
      style={{ marginInlineEnd: 0, ...style }}
    >
      {children}
    </Tag>
  );
}
