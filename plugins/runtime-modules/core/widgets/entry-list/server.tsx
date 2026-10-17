import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { fetchPhiSiteContentEntries } from "../../../../../gateway/content-entries";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import { buildPhiEntryViews } from "./view.server";
import { normalizePhiEntryListWidgetConfig, type PhiEntryListWidgetConfig } from "./config";

export type PhiEntryListWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryListWidgetConfig> & {
  links?: PhiResolvedLinkTargets | null;
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
 */
export async function PhiEntryListWidget({ config, runtime, links }: PhiEntryListWidgetProps) {
  const settings = normalizePhiEntryListWidgetConfig(config);
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const labels = await getPhiContentEntryReaderLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale,
  });

  let entries;
  try {
    entries = await fetchPhiSiteContentEntries({
      kind: settings.kind,
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      locale,
      limit: settings.limit,
    });
  } catch {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }

  const views = await buildPhiEntryViews({
    kind: settings.kind,
    entries,
    runtime,
    showLinks: settings.showLinks,
    showTags: settings.showTags,
    detailLinkTarget: settings.detailLinkTarget,
    links,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryList}
      componentProps={{ entries: views, labels }}
    />
  );
}
