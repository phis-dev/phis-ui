"use client";

import type { CSSProperties, ReactNode } from "react";

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
 * **The corner and the colours arrive by themselves, and no caller passes them.** The corner is the Theme's
 * surface step, `--phi-surface-radius` (THEME.md "Control shape"), so a Site set to `square` draws square
 * corners here without this file or its callers knowing that shapes exist; the ground, the frame, the
 * heading and the lift under the pointer are the Theme's tokens, read as the variables Ant Design
 * publishes for them (`styles/controls.css`, "Card"). A box that names any of them by hand is a box that
 * stops following the Theme the moment somebody changes it -- which is what every hand-built panel this
 * control replaced did. The only decision left here is the inset, and that is the one below.
 *
 * **Not Ant Design's `Card`.** It imports the Tabs, for a tab list this house never offers, and every page
 * with a card -- a sign-in form on a Landing among them -- shipped the Tabs code with it. The box is a frame,
 * a heading bar and a body; drawing those is cheaper than carrying a component that brings what nobody
 * asked for.
 *
 * `toolbar` sits where Ant Design put its `extra`, under the name this house already uses for it in
 * `PhiCollectionHeaderControl`. A toolbar without a `title` still draws the heading bar, as the primitive
 * this replaced did.
 *
 * **A card is a box, not a layout.** Anything that arranges what is inside it belongs to the caller's own
 * element, which is why there is no body style: a Widget that wants its parts on a grid puts the grid in
 * a `div` of its own rather than reaching into the Card's body through the primitive.
 *
 * `padding` is the exception, and it is not one of those: the inset of a box is the box's own business,
 * which is why this control already decides it. A caller that needs a different one says so here. The
 * alternative was a `div` wrapped around the Card to pad it from outside, which is a box around a box and
 * pads the wrong side of the frame -- if a Card needs a wrapper to be spaced, the prop was missing.
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
  /**
   * The body's own inset, where the Theme's answer is not the right one.
   *
   * Absent is the Theme's -- `padding` at the ordinary size and `paddingSM` for chrome -- and that stays
   * the answer to "nothing was said" rather than becoming a ceiling. A Widget whose configuration carries
   * a padding passes it straight through; nothing has to know which of the two it got.
   */
  padding?: number | string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function PhiCardControl({
  title,
  toolbar,
  cover,
  size = "medium",
  hoverable,
  padding,
  style,
  children,
}: PhiCardControlProps) {
  const { token } = usePhiConfig();
  const className = [
    "phi-card-control",
    size === "small" ? "phi-card-control--small" : null,
    hoverable ? "phi-card-control--hoverable" : null,
  ].filter(Boolean).join(" ");
  return (
    <div className={className} style={style}>
      {title != null || toolbar != null ? (
        <div className="phi-card-control__head">
          {title != null ? <div className="phi-card-control__title">{title}</div> : null}
          {toolbar != null ? <div className="phi-card-control__toolbar">{toolbar}</div> : null}
        </div>
      ) : null}
      {cover != null ? <div className="phi-card-control__cover">{cover}</div> : null}
      <div
        className="phi-card-control__body"
        style={{ padding: padding ?? (size === "small" ? token.paddingSM : token.padding) }}
      >
        {children}
      </div>
    </div>
  );
}
