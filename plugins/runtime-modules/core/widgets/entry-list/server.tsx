import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { fetchPhiSiteContentEntries } from "../../../../../gateway/content-entries";
import { loadPhiContentEntryPage } from "../../../../../server-helpers/content-entry-page";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { trBulk } from "../../../../../server-helpers/translate";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import { buildPhiEntryViews } from "./view.server";
import { normalizePhiEntryListWidgetConfig, type PhiEntryListWidgetConfig } from "./config";

export type PhiEntryListWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryListWidgetConfig> & {
  links?: PhiResolvedLinkTargets | null;
  /** Whether the heading is translated: the node's `NoTranslate` flag, read by the plugin. */
  translate?: boolean;
};

/**
 * One kind's published entries, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * Nothing here depends on the visitor -- published entries are the same for everybody -- so it belongs in
 * the render rather than in a request the browser makes afterwards. On a Public page that is also the only
 * way an expired entry can be absent instead of appearing and then disappearing.
 *
 * A failed read says so. The alternative is a page with a heading and nothing under it, which a visitor
 * reads as "this Site has published nothing" and an operator cannot tell from the real thing.
 *
 * A `related` list is the exception twice over. It reads through the detail Page's own question
 * (`loadPhiContentEntryPage`), so it costs Core nothing the Page did not already ask, and it is cut to as
 * many as that question answers. And with nothing related -- or nothing to be related to -- it draws
 * nothing at all: a "more like this" heading over an empty space says something false.
 */
export async function PhiEntryListWidget({ config, runtime, links, translate = true }: PhiEntryListWidgetProps) {
  const settings = normalizePhiEntryListWidgetConfig(config);
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const labels = await getPhiContentEntryReaderLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale,
  });

  const related = settings.source === "related";
  if (related && !settings.relatedTo) {
    return null;
  }

  let entries;
  try {
    entries = related
      ? ((await loadPhiContentEntryPage(runtime, { kind: settings.kind, slug: settings.relatedTo }))?.related ?? [])
        .slice(0, settings.limit)
      : await fetchPhiSiteContentEntries({
        kind: settings.kind,
        apiBaseUrl: rt.apiBaseUrl,
        internalToken: rt.internalToken,
        siteKey: rt.siteKey,
        locale,
        limit: settings.limit,
      });
  } catch {
    return related ? null : <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }

  const views = await buildPhiEntryViews({
    kind: settings.kind,
    entries,
    runtime,
    parts: settings.show,
    detailLinkTarget: settings.detailLinkTarget,
    links,
    body: settings.presentation === "stack" ? "full" : "teaser",
  });

  const [title] = settings.title && translate ? await trBulk([settings.title]) : [settings.title];

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryList}
      componentProps={{
        entries: views,
        labels,
        presentation: settings.presentation,
        parts: settings.show,
        ...(title ? { title } : {}),
        emptyBehavior: related ? "hide" : "say",
      }}
    />
  );
}
