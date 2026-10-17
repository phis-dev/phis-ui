"use client";

import type { PhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiEntryBody, type PhiEntryListEntryView } from "../entry-list/client";

export type PhiEntryDetailWidgetClientProps = {
  entry: PhiEntryListEntryView;
  labels: PhiContentEntryReaderLabels;
  parts: number;
};

/** One entry's text; its title, byline and category are the header's (`entry-header`). */
export function PhiEntryDetailWidgetClient({ entry, labels, parts }: PhiEntryDetailWidgetClientProps) {
  return (
    <article>
      <PhiEntryBody entry={entry} parts={parts} labels={labels} />
    </article>
  );
}
