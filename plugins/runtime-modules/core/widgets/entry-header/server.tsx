import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { loadPhiContentEntryPage } from "../../../../../server-helpers/content-entry-page";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { buildPhiEntryViews } from "../entry-list/view.server";
import { normalizePhiEntryHeaderWidgetConfig, type PhiEntryHeaderWidgetConfig } from "./config";

export type PhiEntryHeaderWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryHeaderWidgetConfig>;

/**
 * The opening of one published entry, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * Through the detail Page's own question (`loadPhiContentEntryPage`), like the body beside it, so the two
 * cost Core one read between them. Only the meta is prepared: the body is not parsed for a header.
 */
export async function PhiEntryHeaderWidget({ config, runtime }: PhiEntryHeaderWidgetProps) {
  const settings = normalizePhiEntryHeaderWidgetConfig(config);
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
    body: "teaser",
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryHeader}
      componentProps={{ entry: view, parts: settings.show, titleLevel: settings.titleLevel, align: settings.align }}
    />
  );
}
