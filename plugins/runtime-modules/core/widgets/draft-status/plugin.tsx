import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiDraftStatusWidgetLabels } from "../../../../../components/widgets/label-sets/draft-status";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";
import { PHI_DRAFT_STATUS_WIDGET_DEFINITION, type PhiDraftStatusWidgetConfig } from "./config";

type PhiDraftStatusRenderRuntime =
  Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiDraftStatusWidgetConfig>["render"]>>[0]["runtime"];

async function loadLabels(runtime: PhiDraftStatusRenderRuntime) {
  return getPhiDraftStatusWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
}

export const PHI_DRAFT_STATUS_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiDraftStatusWidgetConfig> = {
  ...PHI_DRAFT_STATUS_WIDGET_DEFINITION,
  render: async ({ config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.DraftStatus}
      componentProps={{ config, labels: await loadLabels(runtime) }}
    />
  ),
  // A preview asks no Controller: it would answer for the draft being edited, not the one shown.
  renderPreview: async ({ config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.DraftStatus}
      componentProps={{
        config,
        labels: await loadLabels(runtime),
        signalsEnabled: false,
      }}
    />
  ),
};
