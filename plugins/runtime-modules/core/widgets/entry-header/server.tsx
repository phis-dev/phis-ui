import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import { readPhiBoundContentEntry } from "../../content-entries/record-source.server";
import { buildPhiEntryViews } from "../entry-list/view.server";
import { normalizePhiEntryHeaderWidgetConfig, type PhiEntryHeaderWidgetConfig } from "./config";

export type PhiEntryHeaderWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryHeaderWidgetConfig> & {
  /** Where the record binding is answered; absent outside a page render, where nothing is bound. */
  registry?: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey">;
};

/**
 * The opening of one published entry, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * Through its record binding (`types/record-provider.ts`), like the body beside it: one Provider and the
 * same parameters are answered once per request, so the two cost Core one read between them. Only the
 * meta is prepared: the body is not parsed for a header.
 */
export async function PhiEntryHeaderWidget({ config, runtime, registry }: PhiEntryHeaderWidgetProps) {
  const settings = normalizePhiEntryHeaderWidgetConfig(config);
  const rt = phiRuntime(runtime);
  const labels = await getPhiContentEntryReaderLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  const bound = await readPhiBoundContentEntry({ registry, runtime, binding: settings.entry });
  if (bound.status === "unavailable") {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }
  if (bound.status === "missing") {
    return <PhiAlertControl level="info" showIcon title={labels.emptyTitle} description={labels.emptyText} />;
  }

  const [view] = await buildPhiEntryViews({
    kind: bound.record.kind,
    entries: [bound.record.entry],
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
