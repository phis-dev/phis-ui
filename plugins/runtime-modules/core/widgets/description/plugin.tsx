import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiDescriptionWidget } from "./server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_DESCRIPTION_WIDGET_DEFINITION,
  PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE,
  type PhiCmsDescriptionWidgetConfig,
} from "./config";

export const PHI_DESCRIPTION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsDescriptionWidgetConfig> = {
  ...PHI_DESCRIPTION_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiDescriptionWidget
      key={`widget-${widget.id}`}
      labels={{
        eyebrow: config.eyebrow,
        title: config.title,
        description: config.description,
        asideTitle: config.asideTitle,
        asideItems: config.asideItems,
        footer: config.footer,
      }}
      config={config}
      runtime={runtime}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      key={`widget-preview-${widget.id}`}
      type={PhiCmsWidgetType.Description}
      componentProps={{
        labels: {
          eyebrow: config.eyebrow,
          title: config.title,
          description: config.description,
          asideTitle: config.asideTitle,
          asideItems: config.asideItems,
          footer: config.footer,
        },
        config: {},
      }}
    />
  ),
};

export { PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE };
