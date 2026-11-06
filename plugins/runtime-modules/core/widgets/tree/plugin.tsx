import type { PhiCmsServerWidgetPlugin, PhiTreeWidgetConfig } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import { PHI_TREE_WIDGET_DEFINITION } from "./config";
import { PhiTreeWidget } from "./server";
import { getPhiTreeWidgetLabels } from "../../../../../components/widgets/label-sets/tree";

async function PhiTreeWidgetPluginServer({ widget, config, runtime }: {
  widget: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiTreeWidgetConfig>["render"]>>[0]["widget"];
  config: PhiTreeWidgetConfig;
  runtime: Parameters<NonNullable<PhiCmsServerWidgetPlugin<PhiTreeWidgetConfig>["render"]>>[0]["runtime"];
}) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiTreeWidgetLabels({ apiBaseUrl: rt.apiBaseUrl, internalToken: rt.internalToken, locale: runtime.locale.current });
  return <PhiTreeWidget config={config} labels={labels} renderMode={readPhiRuntimeTreeRenderMode(widget.config)} />;
}

export const PHI_TREE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiTreeWidgetConfig> = {
  ...PHI_TREE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiTreeWidgetPluginServer {...args} />),
};
