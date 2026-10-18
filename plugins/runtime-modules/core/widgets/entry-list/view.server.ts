import "server-only";

import type { PhiContentEntryKind } from "../../../../../constants/content-entry-kinds";
import { hasPhiContentEntryPart, PhiContentEntryPart } from "../../../../../constants/content-entry-parts";
import { formatPhiDate } from "../../../../../helpers/format-date-time";
import { collectPhiLinkTargetReferences, resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { resolvePhiLinkTargetReferences } from "../../../../../server-helpers/cms-link-targets";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiSiteContentEntry } from "../../../../../types/content-entries";
import type { PhiLinkTarget, PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiMarkdownBlock, PhiMarkdownInline } from "../../../../../components/widgets/shared/markdown-body-client";
import type { PhiEntryListEntryView } from "./client";

/** How long a teaser cut from the body may run: two lines of a card at the reading measure. */
const TEASER_MAX_LENGTH = 200;

function inlineText(inlines: readonly PhiMarkdownInline[]): string {
  return inlines.map((inline) => {
    if (inline.kind === "text" || inline.kind === "inline_code") return inline.text;
    if (inline.kind === "break") return " ";
    if (inline.kind === "image") return "";
    return inlineText(inline.children);
  }).join("");
}

/**
 * The entry in a sentence or two: the subtitle where it has one, otherwise the start of the first
 * paragraph -- read from the translated blocks, so a teaser is in the page's language like the body. Cut at
 * a word, never in one.
 */
function readTeaser(subtitle: string, blocks: readonly PhiMarkdownBlock[]) {
  if (subtitle.trim()) return subtitle.trim();
  const paragraph = blocks.find((block) => block.kind === "paragraph");
  const text = paragraph?.kind === "paragraph" ? inlineText(paragraph.inlines).replace(/\s+/gu, " ").trim() : "";
  if (text.length <= TEASER_MAX_LENGTH) return text;
  const cut = text.slice(0, TEASER_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > TEASER_MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Entries as the entry Widgets draw them, prepared on the server: the body parsed and translated, the date
 * formatted in the page's language, the links resolved.
 *
 * `parts` is the Widget's mask (`constants/content-entry-parts.ts`). Only what costs something follows it
 * here -- an entry's link is resolved against the Page tree only where the link is shown; the rest is
 * carried and the Client shows what the mask says.
 */
export async function buildPhiEntryViews({
  kind,
  entries,
  runtime,
  parts,
  detailLinkTarget,
  links,
  body: bodyMode = "full",
}: {
  kind: PhiContentEntryKind;
  entries: readonly PhiSiteContentEntry[];
  runtime: PhiBlockRuntime;
  parts: number;
  /** The detail route each entry's title leads to, filled with its slug; absent on the detail Page. */
  detailLinkTarget?: PhiLinkTarget;
  links?: PhiResolvedLinkTargets | null;
  /**
   * `full` draws the body; `teaser` only needs what a card says, so a body is parsed and translated only
   * where the entry has no subtitle to stand for it -- and then only for its first paragraph's sake.
   */
  body?: "full" | "teaser";
}): Promise<PhiEntryListEntryView[]> {
  const showLinks = hasPhiContentEntryPart(parts, PhiContentEntryPart.Link);
  const settings = { kind, showLinks, detailLinkTarget };
  const locale = runtime.locale.current;
  /*
   * The body is Markdown, and it is parsed and translated here rather than answered translated by Core.
   *
   * Only the inline content of headings, paragraphs and table cells is handed to a provider, as HTML --
   * the structure, code fences and raw HTML never are (`collectMarkdownTranslationUnits`). That is what
   * makes Markdown the right standard for an entry: the control characters are not spared, they are never
   * sent. It also means each paragraph is its own cache entry, so correcting one costs one.
   *
   * The entry's own language and switch decide, not the Widget's: they belong to the words.
   */
  /*
   * Imported here rather than at the top: the Widget catalogue loads every Module's server file at
   * start-up, and reaching into the core Module's graph from there closes a cycle through its data
   * provider keys -- eleven unrelated suites failed on an undefined constant before this moved inside.
   */
  const { resolveMarkdownRenderData } = await import("../../../../../components/widgets/shared/markdown-render");

  /*
   * Every entry's Page in one question, the way a render resolves its Widgets' links: a Page that is gone
   * or unpublished resolves to nothing, and the entry then shows no link rather than one to nowhere.
   */
  const resolvedLinks = settings.showLinks
    ? await resolvePhiLinkTargetReferences(
      collectPhiLinkTargetReferences(entries.map((entry) => ({ linkTarget: entry.link }))),
      runtime,
    )
    : null;

  const views: PhiEntryListEntryView[] = await Promise.all(
    entries.map(async (entry, index) => {
      // Core answers the slug where an entry has one; the index is the fallback for an entry that has
      // none, so two entries can never share a React key -- or a heading anchor.
      const id = entry.id || entry.slug || `${settings.kind}-${index}`;
      const needsBody = bodyMode === "full" || !entry.subtitle.trim();
      const body = needsBody && entry.content.trim()
        ? await resolveMarkdownRenderData({
          sourceMode: "inline",
          markdown: entry.content,
          translate: entry.translate,
          sourceLocale: entry.sourceLocale ?? undefined,
          widgetId: `${settings.kind}-${id}`,
          // A teaser is the first paragraph; the rest is neither drawn nor translated.
          extent: bodyMode === "full" ? "document" : "first-paragraph",
        }, runtime)
        : { blocks: [] };

      return {
        id,
        title: entry.title,
        subtitle: entry.subtitle,
        blocks: bodyMode === "full" && !("error" in body) ? body.blocks : [],
        teaser: readTeaser(entry.subtitle, "error" in body ? [] : body.blocks),
        date: formatPhiDate(entry.created, locale),
        machineDate: entry.created,
        link: settings.showLinks ? resolvePhiLinkHref(entry.link, resolvedLinks) : null,
        // The kind's detail route with this entry's slug; no route that resolves, no link on the title.
        detail: entry.slug ? resolvePhiLinkHref(settings.detailLinkTarget, links, { slug: entry.slug }) : null,
        tags: entry.tags.map((tag) => tag.label),
        category: entry.category?.label ?? null,
        author: entry.author ? { name: entry.author.name, avatarUrl: entry.author.avatar?.url ?? null } : null,
      };
    }),
  );

  return views;
}
