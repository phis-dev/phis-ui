import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { fetchPhiSiteContentEntry } from "../../../../../gateway/content-entries";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { buildPhiEntryViews } from "../entry-list/view.server";
import { normalizePhiEntryDetailWidgetConfig, type PhiEntryDetailWidgetConfig } from "./config";

export type PhiEntryDetailWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryDetailWidgetConfig>;

/**
 * One published entry, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * On a detail route the tree has already asked for the entry and answered 404 where there is none, so an
 * entry missing here is one that expired between the two reads or a slug a Site typed into a Page of its
 * own. Both say so rather than draw an empty Page.
 */
export async function PhiEntryDetailWidget({ config, runtime }: PhiEntryDetailWidgetProps) {
  const settings = normalizePhiEntryDetailWidgetConfig(config);
  const rt = phiRuntime(runtime);
  const labels = await getPhiContentEntryReaderLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  let entry;
  try {
    entry = await fetchPhiSiteContentEntry({
      kind: settings.kind,
      slug: settings.slug,
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      locale: runtime.locale.current,
    });
  } catch {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }
  if (!entry) {
    return <PhiAlertControl level="info" showIcon title={labels.emptyTitle} description={labels.emptyText} />;
  }

  const [view] = await buildPhiEntryViews({
    kind: settings.kind,
    entries: [entry],
    runtime,
    showLinks: settings.showLinks,
    showTags: settings.showTags,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryDetail}
      componentProps={{ entry: view, labels }}
    />
  );
}
