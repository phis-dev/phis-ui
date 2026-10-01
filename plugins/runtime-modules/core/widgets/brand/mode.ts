/*
 * The Brand Widget's modes, apart from `config.ts` because the live client asks which one it is on every
 * render, and the config module is the parser with the block defaults merge behind it.
 */

/**
 * Which part of the Brand this Widget stands for, and the only thing it is asked.
 *
 * What the Brand *is* -- the Logo, the Wordmark's parts and their type, the eyebrow, the two lines --
 * is stated once in the Theme (`PhiSiteThemeBrand`). A placement never restates it; it picks which part
 * of it to draw here, and reads the rest. That is why there is one field and no overrides beside it.
 *
 * `lockup` is the Logo and the Wordmark set together, which is what the trade calls that pairing. It is
 * deliberately not named `mark`: a mark is the picture and a wordmark is the name in type, so a `mark`
 * that meant "both" left `mark` and `wordmark` reading like a typo for one another.
 *
 * The lines are modes rather than a second field. They were `mode: "line"` plus `line: "slogan"`, which
 * is one question asked twice -- and a Widget that had answered only the first was guessed at.
 *
 * The one thing beside the mode is the type of the two lines, and it is not an override of the Brand: the
 * Brand writes the sentence, the placement says how large it stands here, because the same slogan sits in
 * a header strip and in a footer column. It is asked on the scaffold's toolbar, where a Simple Text is
 * asked the same thing, and nowhere else -- the mark modes take their type from the Theme's Wordmark.
 */
export type PhiBrandWidgetMode =
  | "lockup"
  | "logo"
  | "wordmark"
  | "slogan"
  | "location";

/** The modes that draw one of the Brand's sentences rather than the Brand itself. */
export type PhiBrandWidgetLineMode = Extract<PhiBrandWidgetMode, "slogan" | "location">;

export function isPhiBrandWidgetLineMode(
  mode: PhiBrandWidgetMode | undefined,
): mode is PhiBrandWidgetLineMode {
  return mode === "slogan" || mode === "location";
}
