import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_LENGTH_WIDGET_DEFINITION,
  PHI_LENGTH_WIDGET_PLUGIN_TYPE,
  type PhiLengthWidgetConfig,
} from "./config";
import { getPhiLengthWidgetLabels } from "../../../../../components/widgets/label-sets/length";

async function renderLengthWidget(
  config: PhiLengthWidgetConfig,
  runtime: Parameters<PhiCmsServerWidgetPlugin<PhiLengthWidgetConfig>["render"]>[0]["runtime"],
  signalsEnabled: boolean,
) {
  const labels = await getPhiLengthWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Length}
      componentProps={{ config, labels, signalsEnabled }}
    />
  );
}

export const PHI_LENGTH_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiLengthWidgetConfig> = {
  ...PHI_LENGTH_WIDGET_DEFINITION,
  render: ({ runtime, config }) => renderLengthWidget(config, runtime, true),
  renderPreview: ({ runtime, config }) => renderLengthWidget(config, runtime, false),
};

export { PHI_LENGTH_WIDGET_PLUGIN_TYPE };
