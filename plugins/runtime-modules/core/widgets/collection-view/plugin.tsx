import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import { PhiCollectionViewWidgetServer } from "./server";
import { PhiWidgetInertPreview } from "../../../../../components/widgets/built-in/widget-preview";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import {
  PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
  PHI_COLLECTION_VIEW_WIDGET_PLUGIN_TYPE,
} from "./config";

export const PHI_COLLECTION_VIEW_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsCollectionViewWidgetConfig> = {
  ...PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiCollectionViewWidgetServer
      key={`widget-${widget.id}`}
      runtime={runtime}
      config={config}
      widgetId={widget.id}
      renderMode={readPhiRuntimeTreeRenderMode(widget.config)}
    />
  ),
  renderPreview: ({ widget, runtime, registry, config }) => (
    <PhiWidgetInertPreview>
      <PhiCollectionViewWidgetServer
        key={`widget-${widget.id}`}
        runtime={runtime}
        registry={registry}
        config={config}
        widgetId={widget.id}
        renderMode={readPhiRuntimeTreeRenderMode(widget.config)}
        preview
      />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_COLLECTION_VIEW_WIDGET_PLUGIN_TYPE };
