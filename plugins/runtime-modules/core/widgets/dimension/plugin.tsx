import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_DIMENSION_WIDGET_DEFINITION,
  PHI_DIMENSION_WIDGET_PLUGIN_TYPE,
  type PhiDimensionWidgetConfig,
} from "./config";
import { getPhiDimensionWidgetLabels } from "../../../../../components/widgets/label-sets/dimension";

async function renderDimensionWidget(
  config: PhiDimensionWidgetConfig,
  runtime: Parameters<PhiCmsServerWidgetPlugin<PhiDimensionWidgetConfig>["render"]>[0]["runtime"],
  signalsEnabled: boolean,
) {
  const labels = await getPhiDimensionWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Dimension}
      componentProps={{ config, labels, signalsEnabled }}
    />
  );
}

export const PHI_DIMENSION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiDimensionWidgetConfig> = {
  ...PHI_DIMENSION_WIDGET_DEFINITION,
  render: ({ runtime, config }) => renderDimensionWidget(config, runtime, true),
  renderPreview: ({ runtime, config }) => renderDimensionWidget(config, runtime, false),
};

export { PHI_DIMENSION_WIDGET_PLUGIN_TYPE };
