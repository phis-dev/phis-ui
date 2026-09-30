import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiNewsListLabels } from "../../../../../components/widgets/label-sets/news";
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
    });
  } catch {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }

  const views: PhiNewsListEntryView[] = entries.slice(0, settings.limit).map((entry, index) => ({
    // Core answers the slug where an entry has one; the index is the fallback for an entry that has none,
    // so two entries can never share a React key.
    id: entry.id || entry.slug || `news-${index}`,
    title: entry.title,
    subtitle: entry.subtitle,
    content: entry.content,
    date: formatPhiDate(entry.created, locale),
    machineDate: entry.created,
    link: settings.showLinks ? entry.link : null,
    tags: settings.showTags ? entry.tags : [],
  }));

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.NewsList}
      componentProps={{ entries: views, labels }}
    />
  );
}
