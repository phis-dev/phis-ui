import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiWidgetFailureServer } from "../../../../../components/widgets/shared/widget-failure.server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { fetchPhiSiteContentEntries } from "../../../../../gateway/content-entries";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import { readPhiBoundContentEntry } from "../../content-entries/record-source.server";
import { buildPhiEntryViews } from "./view.server";
import { normalizePhiEntryListWidgetConfig, type PhiEntryListWidgetConfig } from "./config";
import { pickPhiSequenceSettings } from "../../../../../components/widgets/config/sequence-settings";

export type PhiEntryListWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryListWidgetConfig> & {
  /** Where the record binding is answered; absent outside a page render, where nothing is bound. */
  registry?: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey">;
  links?: PhiResolvedLinkTargets | null;
  /** Whether the heading is translated: the node's `NoTranslate` flag, read by the plugin. */
  translate?: boolean;
  widgetId?: PhiCmsInstanceId | null;
};

/**
 * One kind's published entries, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * Nothing here depends on the visitor -- published entries are the same for everybody -- so it belongs in
 * the render rather than in a request the browser makes afterwards. On a Public page that is also the only
 * way an expired entry can be absent instead of appearing and then disappearing.
 *
 * A failed read is not drawn as a heading with nothing under it, which a visitor reads as "this Site has
 * published nothing". It goes through `PhiWidgetFailureServer`: the author reads why in the Builder, an
 * operator finds it in the log, and the live page goes on without the list.
 *
 * A `related` list is the exception twice over. It reads through its record binding, the one the header
 * and text are bound to, so it costs Core nothing the Page did not already ask, and it is cut to as many
 * as that record carries. And with nothing related -- or nothing to be related to -- it draws
 * nothing at all: a "more like this" heading over an empty space says something false.
 */
export async function PhiEntryListWidget({
  config,
  runtime,
  registry,
  links,
  translate = true,
  widgetId,
}: PhiEntryListWidgetProps) {
  const settings = normalizePhiEntryListWidgetConfig(config);
  const renderMode = readPhiRuntimeTreeRenderMode(config ?? {});
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const labels = await getPhiContentEntryReaderLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale,
  });

  const related = settings.source === "related";
  let kind = settings.kind;
  let entries;
  if (related) {
    const bound = settings.relatedTo
      ? await readPhiBoundContentEntry({ registry, runtime, binding: settings.relatedTo })
      : null;
    // A source that cannot answer is a failure; one that answers nothing is only nothing related.
    if (bound?.status === "unavailable") {
      return (
        <PhiWidgetFailureServer
          renderMode={renderMode}
          widgetType={PhiCmsWidgetType.EntryList}
          widgetId={widgetId}
          title={labels.unavailable}
          description={bound.reason}
        />
      );
    }
    if (bound?.status !== "ok") {
      return null;
    }
    kind = bound.record.kind;
    entries = (bound.record.related ?? []).slice(0, settings.limit);
  } else {
    try {
      entries = await fetchPhiSiteContentEntries({
        kind,
        apiBaseUrl: rt.apiBaseUrl,
        internalToken: rt.internalToken,
        siteKey: rt.siteKey,
        locale,
        limit: settings.limit,
        categories: settings.categories,
      });
    } catch (error) {
      return (
        <PhiWidgetFailureServer
          renderMode={renderMode}
          widgetType={PhiCmsWidgetType.EntryList}
          widgetId={widgetId}
          title={labels.unavailable}
          description={error instanceof Error ? error.message : String(error)}
          error={error}
        />
      );
    }
  }

  const views = await buildPhiEntryViews({
    kind,
    entries,
    runtime,
    parts: settings.show,
    detailLinkTarget: settings.detailLinkTarget,
    links,
    body: settings.presentation === "stack" ? "full" : "teaser",
    // A stacked entry's title is an `h2`; its text's headings start under it.
    headingOffset: 2,
  });

  const [title] = settings.title && translate ? await trBulkForLocale(locale, [settings.title]) : [settings.title];

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryList}
      componentProps={{
        entries: views,
        labels,
        presentation: settings.presentation,
        ...(settings.presentation === "slideshow" ? { sequence: pickPhiSequenceSettings(settings) } : {}),
        parts: settings.show,
        ...(title ? { title } : {}),
        emptyBehavior: related ? "hide" : "say",
      }}
    />
  );
}
