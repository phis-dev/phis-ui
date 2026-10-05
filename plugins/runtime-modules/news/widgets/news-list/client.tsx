"use client";

import { PhiDividerControl } from "../../../../../components/controls/phi-divider-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import {
  PhiMarkdownWidgetClient,
  type PhiMarkdownBlock,
} from "../../../../../components/widgets/shared/markdown-body-client";
import { PHI_SPACE } from "../../../../../theme/antd-css-var-contract";
import type { PhiNewsListLabels } from "../../labels";

/**
 * One entry as the server prepared it.
 *
 * The date arrives formatted, not as an instant. It is formatted in the page's language, which only the
 * server knows -- in the browser `Intl` would use the visitor's own locale, and on a Public page that is
 * rendered once for everybody it would use the server's
 * ([helpers/format-date-time.ts](../../../../../helpers/format-date-time.ts)). `machineDate` is the same
 * moment for the `<time>` attribute, which is not language at all.
 */
export type PhiNewsListEntryView = {
  id: string;
  title: string;
  subtitle: string;
  /** The body, parsed on the server: Markdown never crosses this boundary as text. */
  blocks: PhiMarkdownBlock[];
  date: string;
  machineDate: string;
  link: string | null;
  tags: readonly string[];
};

export type PhiNewsListWidgetClientProps = {
  entries: readonly PhiNewsListEntryView[];
  labels: PhiNewsListLabels;
};

function PhiNewsListEntry({ entry, labels }: { entry: PhiNewsListEntryView; labels: PhiNewsListLabels }) {
  return (
    <article>
      <PhiFlexControl vertical gap={PHI_SPACE.xs}>
        <PhiTypographyControl presentation="text" type="secondary">
          <time dateTime={entry.machineDate}>{entry.date}</time>
        </PhiTypographyControl>
        <PhiTypographyControl presentation="title" level={3} style={{ margin: 0 }}>
          {entry.title}
        </PhiTypographyControl>
        {entry.subtitle ? (
          <PhiTypographyControl presentation="text" strong>
            {entry.subtitle}
          </PhiTypographyControl>
        ) : null}
        {/*
          * The body through the Markdown Widget's own Client, not a second renderer: it already knows how
          * to draw these blocks, including code, tables and internal links. No `tocKey` and no headings
          * are passed, so it contributes nothing to the page's table of contents -- a list of entries is
          * not an article's outline.
          */}
        {entry.blocks.length > 0 ? <PhiMarkdownWidgetClient config={{ blocks: entry.blocks }} /> : null}
        {entry.tags.length > 0 ? (
          <PhiFlexControl wrap gap={PHI_SPACE.xxs}>
            {entry.tags.map((tag) => (
              <PhiTagControl key={tag} variant="outlined">
                {tag}
              </PhiTagControl>
            ))}
          </PhiFlexControl>
        ) : null}
        {entry.link ? <PhiLink href={entry.link}>{labels.readMore}</PhiLink> : null}
      </PhiFlexControl>
    </article>
  );
}

/**
 * The list itself, which holds no state and asks nothing.
 *
 * A Client half rather than markup from the server, because every visual Widget in this package renders
 * through one: the Controls are where antd lives, and a server component cannot use them. Nothing here
 * depends on the visitor, so the first paint already carries every entry.
 */
export function PhiNewsListWidgetClient({ entries, labels }: PhiNewsListWidgetClientProps) {
  if (entries.length === 0) {
    return (
      <PhiEmptyControl
        description={(
          <PhiFlexControl vertical gap={PHI_SPACE.xxs}>
            <PhiTypographyControl presentation="text" strong>{labels.emptyTitle}</PhiTypographyControl>
            <PhiTypographyControl presentation="text" type="secondary">{labels.emptyText}</PhiTypographyControl>
          </PhiFlexControl>
        )}
      />
    );
  }

  return (
    <PhiFlexControl vertical gap={PHI_SPACE.lg}>
      {entries.map((entry, index) => (
        <PhiFlexControl key={entry.id} vertical gap={PHI_SPACE.lg}>
          {index > 0 ? <PhiDividerControl style={{ margin: 0 }} /> : null}
          <PhiNewsListEntry entry={entry} labels={labels} />
        </PhiFlexControl>
      ))}
    </PhiFlexControl>
  );
}
