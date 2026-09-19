"use client";

import type { CSSProperties, ReactNode } from "react";
import { Card } from "antd";

import { usePhiConfig } from "../root/phi-config-provider";

/**
 * A bordered box, with an optional heading bar above what is in it.
 *
 * **The body padding is the Theme's, not Ant Design's.** The primitive hard-codes 12 pixels for a small
 * Card and reaches for `paddingLG` otherwise, and neither lands on the house scale: `paddingSM` is 13,
 * and the ordinary padding a box gets is `padding`, where `paddingLG` on a Fibonacci scale is 55 and
 * makes an ordinary section look like a feature. Four of the five small Cards in the tree had noticed the
 * first half and written the same one-line override by hand; the fifth had not, and it was the Theme
 * preview -- the one box whose entire job is to show what a Theme looks like was the one drawn off the
 * Theme's own scale. Nobody decided any of that, and nobody should have to notice it again.
 *
 * `toolbar` is Ant Design's `extra` under the name this house already uses for it in
 * `PhiCollectionHeaderControl`. It is passed straight through, which means a toolbar without a `title`
 * still draws the heading bar -- that is the primitive's behaviour, and inventing a rule against it here
 * would only hide it.
 *
 * **A card is a box, not a layout.** Anything that arranges what is inside it belongs to the caller's own
 * element, which is why there is no body style: a Widget that wants its parts on a grid puts the grid in
 * a `div` of its own rather than reaching into the Card's body through the primitive.
 */
export type PhiCardControlProps = {
  /** A heading in a bar of its own above the body, with a rule under it. */
  title?: ReactNode;
  /** What belongs to the heading rather than to the body -- an action, usually. */
  toolbar?: ReactNode;
  /** An opening image, drawn across the full width above the body. */
  cover?: ReactNode;
  /** `small` is the size of chrome -- an inspector panel, a preview frame -- against a card on a page. */
  size?: "small" | "medium";
  /** The box lifts under the pointer, which is how a card says that the whole of it is a link. */
  hoverable?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
};

export function PhiCardControl({
  title,
  toolbar,
  cover,
  size = "medium",
  hoverable,
  style,
  children,
}: PhiCardControlProps) {
  const { token } = usePhiConfig();
  return (
    <Card
      title={title}
      extra={toolbar}
      cover={cover}
      size={size}
      hoverable={hoverable}
      style={style}
      styles={{ body: { padding: size === "small" ? token.paddingSM : token.padding } }}
    >
      {children}
    </Card>
  );
}
