import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { getPhiRecordWidgetLabels } from "../../../../../components/widgets/label-sets/record";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import { PHI_RECORD_WIDGET_DEFINITION, PHI_RECORD_WIDGET_PLUGIN_TYPE } from "./config";
import { PhiRecordWidget } from "./server";

async function PhiRecordWidgetPluginServer({
  config,
  runtime,
}: {
  config: PhiRecordWidgetConfig;
  runtime: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiRecordWidgetConfig>["render"]>>[0]["runtime"];
}) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiRecordWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });
  return <PhiRecordWidget config={config} labels={labels} />;
}

export const PHI_RECORD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiRecordWidgetConfig> = {
  ...PHI_RECORD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiRecordWidgetPluginServer {...args} />),
};

export { PHI_RECORD_WIDGET_PLUGIN_TYPE };
