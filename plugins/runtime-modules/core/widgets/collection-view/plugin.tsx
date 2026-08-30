import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import type { PhiCmsCollectionViewWidgetConfig } from "./config";
import { PhiCollectionViewWidgetServer } from "./server";
import { PhiWidgetInertPreview } from "../../../../../components/widgets/built-in/widget-preview";
import {
  PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
  PHI_COLLECTION_VIEW_WIDGET_PLUGIN_TYPE,
} from "./config";

export const PHI_COLLECTION_VIEW_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsCollectionViewWidgetConfig> = {
  ...PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiCollectionViewWidgetServer key={`widget-${widget.id}`} runtime={runtime} config={config} widgetId={widget.id} />
  ),
  renderPreview: ({ widget, runtime, config }) => (
    <PhiWidgetInertPreview>
      <PhiCollectionViewWidgetServer
        key={`widget-${widget.id}`}
        runtime={runtime}
        config={config}
        widgetId={widget.id}
        preview
      />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_COLLECTION_VIEW_WIDGET_PLUGIN_TYPE };
