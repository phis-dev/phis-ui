import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_PAGINATION_WIDGET_DEFINITION, type PhiPaginationWidgetConfig } from "./config";

export const PHI_PAGINATION_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiPaginationWidgetConfig> = {
  ...PHI_PAGINATION_WIDGET_DEFINITION,
  render: ({ config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Pagination}
      componentProps={{ config }}
    />
  ),
  renderPreview: ({ config }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Pagination}
      componentProps={{ config, signalsEnabled: false }}
    />
  ),
};
