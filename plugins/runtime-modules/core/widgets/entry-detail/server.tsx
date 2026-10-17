import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { loadPhiContentEntryPage } from "../../../../../server-helpers/content-entry-page";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { buildPhiEntryViews } from "../entry-list/view.server";
import { normalizePhiEntryDetailWidgetConfig, type PhiEntryDetailWidgetConfig } from "./config";

export type PhiEntryDetailWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryDetailWidgetConfig>;

/**
 * The text of one published entry, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * It reads through the detail Page's own question (`loadPhiContentEntryPage`), so on a detail route the
 * entry the tree already read is answered from the request memo rather than asked for again. On a detail
 * route the tree has also already answered 404 where there is none, so an entry missing here is one that
 * expired between the two reads or a slug a Site typed into a Page of its own. Both say so rather than
 * draw an empty Page.
 */
export async function PhiEntryDetailWidget({ config, runtime }: PhiEntryDetailWidgetProps) {
  const settings = normalizePhiEntryDetailWidgetConfig(config);
  const rt = phiRuntime(runtime);
  const labels = await getPhiContentEntryReaderLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  let page;
  try {
    page = await loadPhiContentEntryPage(runtime, { kind: settings.kind, slug: settings.slug });
  } catch {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }
  if (!page) {
    return <PhiAlertControl level="info" showIcon title={labels.emptyTitle} description={labels.emptyText} />;
  }

  const [view] = await buildPhiEntryViews({
    kind: settings.kind,
    entries: [page.entry],
    runtime,
    parts: settings.show,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryDetail}
      componentProps={{ entry: view, labels, parts: settings.show }}
    />
  );
}
