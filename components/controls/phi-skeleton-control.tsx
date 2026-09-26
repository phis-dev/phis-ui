"use client";

import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "antd";

/**
 * The shape of what is coming, drawn while it is not there yet.
 *
 * Usable only where that shape is known and roughly fixed -- a list of rows, a field, a tile. Where it
 * is not, the placeholder has to guess, and a guess that turns out wrong rearranges the page under
 * somebody who had already started reading: that case is `PhiSpinControl`, which claims nothing. The
 * question a caller answers is which of the two they can honestly offer, not which looks better.
 *
 * **What this normalizes, and what it deliberately does not.** Every site wrote `paragraph={{ rows: n }}`
 * -- a nested object, the same way, twelve times -- so that becomes `lines`. What stays per-site is
 * the number itself. Three lines standing in for a form preview and eight for a security page are not
 * a value somebody failed to centralize; they are two different pages, and a platform rule that picked
 * one would be wrong on the other. A Control owns the vocabulary, not the measurements.
 *
 * `active` defaults to true because a placeholder normally means *waiting*, and shimmering is how that
 * reads. The exception is real and kept: a Builder preview draws a still placeholder to mean *this
 * Widget has nothing to preview*, which is a statement about the Widget rather than about a wait, and
 * an animation there would promise something that is never going to arrive.
 */
type PhiSkeletonSharedProps = {
  /** Whether it shimmers. True means waiting; false means there is nothing to wait for. */
  active?: boolean;
  style?: CSSProperties;
};

export type PhiSkeletonControlProps =
  | (PhiSkeletonSharedProps & {
      presentation?: "lines";
      /** How many lines of text to stand in for. */
      lines?: number;
      /** How wide each line is, where the shape being stood in for is known that precisely. */
      lineWidths?: readonly (string | number)[];
      /** A heading above the lines. */
      withTitle?: boolean;
    })
  | (PhiSkeletonSharedProps & {
      /** One field, one button, or one area of arbitrary content. */
      presentation: "input" | "button";
      size?: "small" | "default" | "large";
      block?: boolean;
      /**
       * Stand in for the whole frame around it, on both axes, rather than for one field's worth of it.
       *
       * What a caller reaches for where the box is already measured -- a square media tile, a fixed
       * row -- and cannot say with `style` alone; see `PHI_SKELETON_FILL_BOX`.
       */
      fill?: boolean;
      shape?: "circle" | "square" | "round" | "default";
    })
  | (PhiSkeletonSharedProps & {
      presentation: "node";
      children?: ReactNode;
    });

/**
 * The box a `fill` placeholder measures, stated on both of Ant Design's two elements.
 *
 * A caller's `style` reaches only the INNER element -- Ant Design keeps the outer box for `styles.root`
 * -- and that outer box has no height of its own. A percentage height on the inner element therefore
 * resolved against `auto` and computed to `auto` as well, so a placeholder asked to fill a square tile
 * collapsed to nothing and the tile looked as though it had no image placeholder at all. Stating the box
 * on the root gives the percentage something to resolve against.
 *
 * `minWidth: 0` because Ant Design's own field placeholder carries a minimum width of several Control
 * heights, which is wider than a column in a dense grid and would push out of the frame it is filling.
 */
const PHI_SKELETON_FILL_BOX: CSSProperties = { width: "100%", minWidth: 0, height: "100%" };

export function PhiSkeletonControl(props: PhiSkeletonControlProps) {
  const active = props.active ?? true;

  /*
   * A `switch` rather than chained `if`s, and not as a matter of taste.
   *
   * `presentation` is optional on the text branch, so narrowing it away by elimination leaves the
   * compiler holding `undefined` for every member and none of the other props readable. Switching on
   * the discriminant narrows each case properly and puts the text branch in `default`, where the
   * optional one belongs.
   *
   * `title` is passed as a boolean rather than left to Ant Design's default of `true`: half the sites
   * turned it off and half did not, so neither answer is the obvious one, and a default that is right
   * half the time is a default somebody has to go and check.
   */
  switch (props.presentation) {
    case "input":
      return (
        <Skeleton.Input
          active={active}
          size={props.size}
          block={props.block}
          {...(props.fill ? { styles: { root: PHI_SKELETON_FILL_BOX } } : {})}
          style={props.fill ? { ...PHI_SKELETON_FILL_BOX, ...props.style } : props.style}
        />
      );
    case "button":
      return (
        <Skeleton.Button
          active={active}
          size={props.size}
          block={props.block}
          shape={props.shape}
          {...(props.fill ? { styles: { root: PHI_SKELETON_FILL_BOX } } : {})}
          style={props.fill ? { ...PHI_SKELETON_FILL_BOX, ...props.style } : props.style}
        />
      );
    case "node":
      return <Skeleton.Node active={active} style={props.style}>{props.children}</Skeleton.Node>;
    default:
      return (
        <Skeleton
          active={active}
          title={props.withTitle ?? false}
          paragraph={{
            rows: props.lines ?? 3,
            ...(props.lineWidths ? { width: [...props.lineWidths] } : {}),
          }}
          style={props.style}
        />
      );
  }
}
