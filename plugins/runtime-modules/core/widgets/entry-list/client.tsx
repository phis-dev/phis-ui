"use client";

import { PhiAvatarControl } from "../../../../../components/controls/phi-avatar-control";
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
import { PhiCollectionLayoutControl } from "../../../../../components/controls/phi-collection-layout-control";
import { PhiCardWidgetClient } from "../../../../../components/widgets/shared/card-body-client";
import { PHI_SURFACE_CARD } from "../../../../../helpers/surface-presets";
import { PHI_SPACE } from "../../../../../theme/antd-css-var-contract";
import { hasPhiContentEntryPart, PhiContentEntryPart } from "../../../../../constants/content-entry-parts";
import type { PhiEntryListPresentation } from "./config";
import type { PhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";

/**
 * One entry as the server prepared it.
 *
 * The date arrives formatted, not as an instant. It is formatted in the page's language, which only the
 * server knows -- in the browser `Intl` would use the visitor's own locale, and on a Public page that is
 * rendered once for everybody it would use the server's
 * ([helpers/format-date-time.ts](../../../../../helpers/format-date-time.ts)). `machineDate` is the same
 * moment for the `<time>` attribute, which is not language at all.
 */
export type PhiEntryListEntryView = {
  id: string;
  title: string;
  subtitle: string;
  /** The body, parsed on the server: Markdown never crosses this boundary as text. */
  blocks: PhiMarkdownBlock[];
  date: string;
  machineDate: string;
  /** Where "Read more" leads, resolved on the server; `null` where the entry has no link that resolves. */
  link: { href: string; newTab: boolean; external: boolean } | null;
  /**
   * The entry in a sentence or two: its subtitle, or where it has none the start of its first paragraph,
   * in the page's language. What a card and a compact line show instead of the body.
   */
  teaser: string;
  /** Where the title leads: the entry's detail Page, resolved on the server, or `null` for none. */
  detail: { href: string; newTab: boolean; external: boolean } | null;
  /** The tags' labels in the page's language. */
  tags: readonly string[];
  /** The category's label, or `null` where the entry is filed under none. */
  category: string | null;
  /** The byline, or `null` where nobody is named. Never an address (`PhiSiteContentEntryAuthor`). */
  author: { name: string; avatarUrl: string | null } | null;
};

export type PhiEntryListWidgetClientProps = {
  entries: readonly PhiEntryListEntryView[];
  labels: PhiContentEntryReaderLabels;
  presentation: PhiEntryListPresentation;
  /** Which parts of each entry show (`constants/content-entry-parts.ts`). */
  parts: number;
  /** The list's own heading, drawn only above entries -- an empty related list leaves no heading behind. */
  title?: string;
  /** Whether no entries is said or simply nothing: a related list under an entry says nothing. */
  emptyBehavior?: "say" | "hide";
};

/**
 * How narrow a column of entry cards may get: the Card Collection's own floor, set by the shortest line
 * of a teaser worth reading rather than by a thumbnail.
 */
const ENTRY_CARD_MIN_COLUMN_WIDTH = 260;

/**
 * One entry as a card: date above, title, teaser, tags below, and the whole card leading to the entry's
 * detail Page. The Card Widget's own card, so an entry looks like every other card of the Site.
 */
function PhiEntryCard({ entry, parts }: { entry: PhiEntryListEntryView; parts: number }) {
  const eyebrow = [
    hasPhiContentEntryPart(parts, PhiContentEntryPart.Category) ? entry.category : null,
    hasPhiContentEntryPart(parts, PhiContentEntryPart.Date) ? entry.date : null,
  ].filter(Boolean).join(" · ");
  const meta = [
    hasPhiContentEntryPart(parts, PhiContentEntryPart.Author) ? entry.author?.name : null,
    hasPhiContentEntryPart(parts, PhiContentEntryPart.Tags) && entry.tags.length > 0 ? entry.tags.join(" · ") : null,
  ].filter(Boolean).join(" — ");
  return (
    <PhiCardWidgetClient
      labels={{
        eyebrow: eyebrow || undefined,
        title: entry.title,
        description: entry.teaser || undefined,
        meta: meta || undefined,
      }}
      config={{
        surface: PHI_SURFACE_CARD,
        ...(entry.detail ? { href: entry.detail.href, external: entry.detail.external } : {}),
      }}
    />
  );
}

/** One entry as a line: its date and title, and the teaser under them. */
function PhiEntryLine({ entry, parts }: { entry: PhiEntryListEntryView; parts: number }) {
  return (
    <PhiFlexControl vertical gap={PHI_SPACE.xxs}>
      <PhiFlexControl gap={PHI_SPACE.xs} align="baseline" wrap>
        {hasPhiContentEntryPart(parts, PhiContentEntryPart.Date) ? (
          <PhiTypographyControl presentation="text" type="secondary">
            <time dateTime={entry.machineDate}>{entry.date}</time>
          </PhiTypographyControl>
        ) : null}
        <PhiTypographyControl presentation="text" strong>
          {entry.detail
            ? <PhiLink href={entry.detail.href} external={entry.detail.external}>{entry.title}</PhiLink>
            : entry.title}
        </PhiTypographyControl>
      </PhiFlexControl>
      {entry.teaser ? (
        <PhiTypographyControl presentation="text" type="secondary" ellipsis>
          {entry.teaser}
        </PhiTypographyControl>
      ) : null}
    </PhiFlexControl>
  );
}

/** What an entry is filed under, as quiet tags. */
function PhiEntryTags({ tags }: { tags: readonly string[] }) {
  return tags.length > 0 ? (
    <PhiFlexControl wrap gap={PHI_SPACE.xxs}>
      {tags.map((tag) => (
        <PhiTagControl key={tag} variant="outlined">
          {tag}
        </PhiTagControl>
      ))}
    </PhiFlexControl>
  ) : null;
}

/**
 * Who wrote it and when, on one line: the picture, the name, the date. Whichever of them the parts leave
 * out, the rest closes up; with none of them there is no line.
 */
function PhiEntryByline({ entry, parts }: { entry: PhiEntryListEntryView; parts: number }) {
  const author = hasPhiContentEntryPart(parts, PhiContentEntryPart.Author) ? entry.author : null;
  const avatar = hasPhiContentEntryPart(parts, PhiContentEntryPart.Avatar) ? entry.author : null;
  const date = hasPhiContentEntryPart(parts, PhiContentEntryPart.Date);
  if (!author && !avatar && !date) return null;
  return (
    <PhiFlexControl gap={PHI_SPACE.xs} align="center" wrap>
      {avatar ? (
        <PhiAvatarControl size={28} src={avatar.avatarUrl ?? undefined} alt="" initialsFrom={avatar.name} />
      ) : null}
      <PhiTypographyControl presentation="text" type="secondary">
        {author ? <>{author.name}{date ? " · " : null}</> : null}
        {date ? <time dateTime={entry.machineDate}>{entry.date}</time> : null}
      </PhiTypographyControl>
    </PhiFlexControl>
  );
}

/**
 * The parts of an entry that are about it rather than the text itself: tags, category, title, subtitle and
 * byline -- each where the parts mask says so (`constants/content-entry-parts.ts`).
 *
 * Shared by the list, which puts the byline above the title the way a stream of entries reads, and the
 * header of a detail Page, which sets it on the tags' line, flush right, so the title stands on its own;
 * where the column is too narrow for both it wraps under the tags. The tags lead, as what the entry is filed
 * under. The title is a link where the entry has a detail Page to lead to, which on that Page itself it
 * does not.
 */
export function PhiEntryMeta({
  entry,
  parts,
  titleLevel = 3,
  byline = "above",
  align = "start",
}: {
  entry: PhiEntryListEntryView;
  parts: number;
  titleLevel?: 1 | 2 | 3;
  byline?: "above" | "below" | "beside";
  align?: "start" | "center";
}) {
  const show = (part: number) => (parts & part) !== 0;
  const bylineNode = <PhiEntryByline entry={entry} parts={parts} />;
  const titleNode = show(PhiContentEntryPart.Title) ? (
    <PhiTypographyControl
      presentation="title"
      level={titleLevel}
      style={{ margin: 0, ...(align === "center" ? { textAlign: "center" } : {}) }}
    >
      {entry.detail
        ? <PhiLink href={entry.detail.href} external={entry.detail.external}>{entry.title}</PhiLink>
        : entry.title}
    </PhiTypographyControl>
  ) : null;
  const tagsNode = show(PhiContentEntryPart.Tags) && entry.tags.length > 0 ? <PhiEntryTags tags={entry.tags} /> : null;
  return (
    <PhiFlexControl vertical gap={PHI_SPACE.xs} align={align === "center" ? "center" : undefined}>
      {byline === "beside" ? (
        // The empty start keeps the byline at the right edge when there are no tags to stand beside.
        <PhiFlexControl justify="space-between" align="center" wrap gap={PHI_SPACE.xs}>
          {tagsNode ?? <span />}
          {bylineNode}
        </PhiFlexControl>
      ) : tagsNode}
      {show(PhiContentEntryPart.Category) && entry.category ? (
        <PhiTypographyControl presentation="text" type="secondary" strong>
          {entry.category}
        </PhiTypographyControl>
      ) : null}
      {byline === "above" ? bylineNode : null}
      {titleNode}
      {show(PhiContentEntryPart.Subtitle) && entry.subtitle ? (
        <PhiTypographyControl presentation="text" strong>
          {entry.subtitle}
        </PhiTypographyControl>
      ) : null}
      {byline === "below" ? bylineNode : null}
    </PhiFlexControl>
  );
}

/**
 * The text of an entry: its body, and after it the tags and the link where the parts mask says so.
 *
 * The body through the Markdown Widget's own Client, not a second renderer: it already knows how to draw
 * these blocks, including code, tables and internal links. No `tocKey` and no headings are passed, so it
 * contributes nothing to the page's table of contents.
 */
export function PhiEntryBody({
  entry,
  parts,
  labels,
}: {
  entry: PhiEntryListEntryView;
  parts: number;
  labels: PhiContentEntryReaderLabels;
}) {
  return (
    <PhiFlexControl vertical gap={PHI_SPACE.xs}>
      {entry.blocks.length > 0 ? <PhiMarkdownWidgetClient config={{ blocks: entry.blocks }} /> : null}
      {hasPhiContentEntryPart(parts, PhiContentEntryPart.Tags) ? <PhiEntryTags tags={entry.tags} /> : null}
      {hasPhiContentEntryPart(parts, PhiContentEntryPart.Link) && entry.link ? (
        <PhiLink href={entry.link.href} external={entry.link.external} newTab={entry.link.newTab}>
          {labels.readMore}
        </PhiLink>
      ) : null}
    </PhiFlexControl>
  );
}

/** The parts a list entry's meta shows; tags and link come after the body, as they always did. */
const ENTRY_META_PARTS = PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle | PhiContentEntryPart.Date
  | PhiContentEntryPart.Author | PhiContentEntryPart.Avatar | PhiContentEntryPart.Category;
const ENTRY_BODY_PARTS = PhiContentEntryPart.Tags | PhiContentEntryPart.Link;

/** One entry whole, as a stream of entries shows it: its meta, then its text. */
function PhiEntryArticle({
  entry,
  labels,
  parts,
}: {
  entry: PhiEntryListEntryView;
  labels: PhiContentEntryReaderLabels;
  parts: number;
}) {
  return (
    <article>
      <PhiFlexControl vertical gap={PHI_SPACE.xs}>
        <PhiEntryMeta entry={entry} parts={parts & ENTRY_META_PARTS} titleLevel={2} />
        <PhiEntryBody entry={entry} parts={parts & ENTRY_BODY_PARTS} labels={labels} />
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
export function PhiEntryListWidgetClient({
  entries,
  labels,
  presentation,
  parts,
  title,
  emptyBehavior = "say",
}: PhiEntryListWidgetClientProps) {
  if (entries.length === 0) {
    if (emptyBehavior === "hide") return null;
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

  const heading = title ? (
    <PhiTypographyControl presentation="title" level={2} style={{ margin: 0 }}>{title}</PhiTypographyControl>
  ) : null;
  const body = presentation === "cards" ? (
    <PhiCollectionLayoutControl
      mode="grid"
      gap={PHI_SPACE.base}
      minColumnWidth={ENTRY_CARD_MIN_COLUMN_WIDTH}
      items={entries.map((entry) => <PhiEntryCard key={entry.id} entry={entry} parts={parts} />)}
    />
  ) : presentation === "compact" ? (
    <PhiFlexControl vertical gap={PHI_SPACE.base}>
      {entries.map((entry) => <PhiEntryLine key={entry.id} entry={entry} parts={parts} />)}
    </PhiFlexControl>
  ) : (
    <PhiFlexControl vertical gap={PHI_SPACE.lg}>
      {entries.map((entry, index) => (
        <PhiFlexControl key={entry.id} vertical gap={PHI_SPACE.lg}>
          {index > 0 ? <PhiDividerControl style={{ margin: 0 }} /> : null}
          <PhiEntryArticle entry={entry} labels={labels} parts={parts} />
        </PhiFlexControl>
      ))}
    </PhiFlexControl>
  );

  return heading ? (
    <PhiFlexControl vertical gap={PHI_SPACE.base}>
      {heading}
      {body}
    </PhiFlexControl>
  ) : body;
}
