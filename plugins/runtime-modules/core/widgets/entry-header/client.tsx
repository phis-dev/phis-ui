"use client";

import { PhiEntryMeta, type PhiEntryListEntryView } from "../entry-list/client";

export type PhiEntryHeaderWidgetClientProps = {
  entry: PhiEntryListEntryView;
  parts: number;
  titleLevel: "h1" | "h2";
  align: "start" | "center";
};

/**
 * An entry's opening, the way an article opens: the byline on the tags' line, flush right, above the title.
 * A centred header has no right edge to set it against, so there it stands under the title.
 */
export function PhiEntryHeaderWidgetClient({ entry, parts, titleLevel, align }: PhiEntryHeaderWidgetClientProps) {
  return (
    <header>
      <PhiEntryMeta entry={entry} parts={parts} titleLevel={titleLevel === "h2" ? 2 : 1} byline={align === "center" ? "below" : "beside"} align={align} />
    </header>
  );
}
