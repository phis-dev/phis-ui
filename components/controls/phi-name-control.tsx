"use client";

import type { ReactNode } from "react";
import { Tooltip } from "antd";

/**
 * A graphic that says what it is.
 *
 * An icon standing in for a column header, an information glyph beside a label, a swatch in a palette:
 * they carry meaning and no text, so the meaning has to be said twice -- once on hover, once to a screen
 * reader. Five sites wrote that pair out by hand and gave four different answers. The spoken name was the
 * description at one, the word "Information" at another and "Option description" at a third, which tells
 * nobody anything; one took focus and four did not, so four hints were unreachable without a mouse; one
 * drew the help cursor. Nothing chose those differences -- they are what happens when the same two lines
 * are typed five times.
 *
 * One string is therefore both, and the rest is settled here: the graphic takes focus, because a hint
 * only a pointer can reach is a hint half the people never get, and it draws the help cursor, because
 * that is what invites the hover in the first place.
 *
 * **Not a tooltip wrapper.** It may set `aria-label` only because it renders the element the name belongs
 * to -- an accessible name cannot be handed to a child from outside it. Something that names itself and
 * wants only the hover text passes that text to its own Control instead: `PhiButtonControl` takes
 * `tooltip`, and `PhiLabeledControl` takes `description` with no label. Reaching for this one to hang a
 * hint on a button would announce the button twice and call it a picture.
 */
export type PhiNameControlProps = {
  /**
   * What the graphic is: shown on hover, spoken as its accessible name.
   *
   * A name that is not a string cannot be spoken, and the graphic then carries the hover text alone --
   * so pass a string wherever the graphic means something.
   */
  name: ReactNode;
  children: ReactNode;
};

export function PhiNameControl({ name, children }: PhiNameControlProps) {
  return (
    <Tooltip title={name}>
      <span
        role="img"
        aria-label={typeof name === "string" ? name : undefined}
        tabIndex={0}
        style={{ display: "inline-flex", alignItems: "center", flex: "none", cursor: "help" }}
      >
        {children}
      </span>
    </Tooltip>
  );
}
