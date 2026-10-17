import "server-only";

import type { PhiContentEntryKind } from "../../../../../constants/content-entry-kinds";
import { formatPhiDate } from "../../../../../helpers/format-date-time";
import { collectPhiLinkTargetReferences, resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { resolvePhiLinkTargetReferences } from "../../../../../server-helpers/cms-link-targets";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiSiteContentEntry } from "../../../../../types/content-entries";
import type { PhiLinkTarget, PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiEntryListEntryView } from "./client";

/**
 * Entries as the list and the detail Widget draw them, prepared on the server: the body parsed and
 * translated, the date formatted in the page's language, the links resolved.
 */
export async function buildPhiEntryViews({
  kind,
  entries,
  runtime,
  showLinks,
  showTags,
  detailLinkTarget,
  links,
}: {
  kind: PhiContentEntryKind;
  entries: readonly PhiSiteContentEntry[];
  runtime: PhiBlockRuntime;
  showLinks: boolean;
  showTags: boolean;
  /** The detail route each entry's title leads to, filled with its slug; absent on the detail Page. */
  detailLinkTarget?: PhiLinkTarget;
  links?: PhiResolvedLinkTargets | null;
}): Promise<PhiEntryListEntryView[]> {
  const settings = { kind, showLinks, showTags, detailLinkTarget };
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
      const body = entry.content.trim()
        ? await resolveMarkdownRenderData({
          sourceMode: "inline",
          markdown: entry.content,
          translate: entry.translate,
          sourceLocale: entry.sourceLocale ?? undefined,
          widgetId: `${settings.kind}-${id}`,
        }, runtime)
        : { blocks: [] };

      return {
        id,
        title: entry.title,
        subtitle: entry.subtitle,
        blocks: "error" in body ? [] : body.blocks,
        date: formatPhiDate(entry.created, locale),
        machineDate: entry.created,
        link: settings.showLinks ? resolvePhiLinkHref(entry.link, resolvedLinks) : null,
        // The kind's detail route with this entry's slug; no route that resolves, no link on the title.
        detail: entry.slug ? resolvePhiLinkHref(settings.detailLinkTarget, links, { slug: entry.slug }) : null,
        tags: settings.showTags ? entry.tags : [],
      };
    }),
  );

  return views;
}
