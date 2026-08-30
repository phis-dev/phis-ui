import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiBuilderInspectorTitleWidgetClient } from "../../../../../plugins/runtime-modules/builder/clients/inspector-title";
import { getPhiInspectorWidgetLabels } from "../../../../../components/widgets/label-sets/inspector";
import { getPhiRegionWidgetLabels } from "../../../../../components/widgets/label-sets/region";
import {
  PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
  type PhiBuilderChromeWidgetConfig,
} from "../chrome/config";

export const PHI_BUILDER_INSPECTOR_HEADER_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig> = {
  ...PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
  render: async ({ runtime }) => {
    const options = {
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    };
    const [inspectorLabels, regionLabels] = await Promise.all([
      getPhiInspectorWidgetLabels(options),
      getPhiRegionWidgetLabels(options),
    ]);
    return (
      <PhiBuilderInspectorTitleWidgetClient
        inspectorLabels={inspectorLabels}
        regionLabels={regionLabels}
      />
    );
  },
  renderPreview: () => null,
};
