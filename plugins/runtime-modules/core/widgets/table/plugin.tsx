import type { PhiCmsServerWidgetPlugin, PhiTableWidgetConfig } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import { PHI_TABLE_WIDGET_DEFINITION } from "./config";
import { PhiTableWidget } from "./server";
import { getPhiTableWidgetLabels } from "../../../../../components/widgets/label-sets/table";

async function PhiTableWidgetPluginServer({
  widget,
  config,
  runtime,
}: {
  widget: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiTableWidgetConfig>["render"]>>[0]["widget"];
  config: PhiTableWidgetConfig;
  runtime: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiTableWidgetConfig>["render"]>>[0]["runtime"];
}) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiTableWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });
  return <PhiTableWidget config={config} labels={labels} renderMode={readPhiRuntimeTreeRenderMode(widget.config)} />;
}

export const PHI_TABLE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiTableWidgetConfig> = {
  ...PHI_TABLE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiTableWidgetPluginServer {...args} />),
};
