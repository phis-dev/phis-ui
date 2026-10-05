import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiNewsListLabels } from "../../labels";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { fetchPhiSiteNews } from "../../../../../gateway/news";
import { formatPhiDate } from "../../../../../helpers/format-date-time";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiNewsListEntryView } from "./client";
import { normalizePhiNewsListWidgetConfig, type PhiNewsListWidgetConfig } from "./config";

export type PhiNewsListWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiNewsListWidgetConfig>;

/**
 * The Site's news, read while the page is drawn.
 *
 * Nothing here depends on the visitor -- published news is the same for everybody -- so it belongs in the
 * render rather than in a request the browser makes afterwards. On a Public page that is also the only
 * way an expired entry can be absent instead of appearing and then disappearing.
 *
 * A failed read says so. The alternative is a page with a heading and nothing under it, which a visitor
 * reads as "this Site has no news" and an operator cannot tell from the real thing.
 */
export async function PhiNewsListWidget({ config, runtime }: PhiNewsListWidgetProps) {
  const settings = normalizePhiNewsListWidgetConfig(config);
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const labels = await getPhiNewsListLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale,
  });

  let entries;
  try {
    entries = await fetchPhiSiteNews({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      locale,
      limit: settings.limit,
    });
  } catch {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }

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

  const views: PhiNewsListEntryView[] = await Promise.all(
    entries.map(async (entry, index) => {
      // Core answers the slug where an entry has one; the index is the fallback for an entry that has
      // none, so two entries can never share a React key -- or a heading anchor.
      const id = entry.id || entry.slug || `news-${index}`;
      const body = entry.content.trim()
        ? await resolveMarkdownRenderData({
          sourceMode: "inline",
          markdown: entry.content,
          translate: entry.translate,
          sourceLocale: entry.sourceLocale ?? undefined,
          widgetId: `news-${id}`,
        }, runtime)
        : { blocks: [] };

      return {
        id,
        title: entry.title,
        subtitle: entry.subtitle,
        blocks: "error" in body ? [] : body.blocks,
        date: formatPhiDate(entry.created, locale),
        machineDate: entry.created,
        link: settings.showLinks ? entry.link : null,
        tags: settings.showTags ? entry.tags : [],
      };
    }),
  );

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.NewsList}
      componentProps={{ entries: views, labels }}
    />
  );
}
