import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiContentEntryReaderLabels } from "../../../../../components/widgets/label-sets/content-entries";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import { readPhiBoundContentEntry } from "../../content-entries/record-source.server";
import { buildPhiEntryViews } from "../entry-list/view.server";
import { normalizePhiEntryDetailWidgetConfig, type PhiEntryDetailWidgetConfig } from "./config";

export type PhiEntryDetailWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiEntryDetailWidgetConfig> & {
  /** Where the record binding is answered; absent outside a page render, where nothing is bound. */
  registry?: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey">;
};

/**
 * The text of one published entry, read while the page is drawn (`CONTENT_ENTRIES.md`).
 *
 * It reads through its record binding (`types/record-provider.ts`), and the content entry Provider asks
 * the detail Page's own question (`loadPhiContentEntryPage`), so on a detail route the entry the tree
 * already read is answered from the request memo rather than asked for again. On a detail
 * route the tree has also already answered 404 where there is none, so an entry missing here is one that
 * expired between the two reads or a slug a Site typed into a Page of its own. Both say so rather than
 * draw an empty Page.
 */
export async function PhiEntryDetailWidget({ config, runtime, registry }: PhiEntryDetailWidgetProps) {
  const settings = normalizePhiEntryDetailWidgetConfig(config);
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
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.EntryDetail}
      componentProps={{ entry: view, labels, parts: settings.show }}
    />
  );
}
