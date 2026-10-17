"use client";

import type { PhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiEntryArticle, type PhiEntryListEntryView } from "../entry-list/client";

export type PhiEntryDetailWidgetClientProps = {
  entry: PhiEntryListEntryView;
  labels: PhiContentEntryReaderLabels;
};

/** One entry without its title, which the Page draws as its own (`entry-list`'s article). */
export function PhiEntryDetailWidgetClient({ entry, labels }: PhiEntryDetailWidgetClientProps) {
  return <PhiEntryArticle entry={entry} labels={labels} showTitle={false} />;
}
