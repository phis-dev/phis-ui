import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { getPhiRecordWidgetLabels } from "../../../../../components/widgets/label-sets/record";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import { PHI_RECORD_WIDGET_DEFINITION } from "./config";
import { PhiRecordWidget } from "./server";

async function PhiRecordWidgetPluginServer({
  widget,
  config,
  runtime,
}: {
  widget: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiRecordWidgetConfig>["render"]>>[0]["widget"];
  config: PhiRecordWidgetConfig;
  runtime: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiRecordWidgetConfig>["render"]>>[0]["runtime"];
}) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiRecordWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });
  return <PhiRecordWidget config={config} labels={labels} renderMode={readPhiRuntimeTreeRenderMode(widget.config)} />;
}

export const PHI_RECORD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiRecordWidgetConfig> = {
  ...PHI_RECORD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiRecordWidgetPluginServer {...args} />),
};
