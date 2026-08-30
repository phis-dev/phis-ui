import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import { PhiProfileOverviewWidget } from "./server";
import {
  PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION,
  PHI_PROFILE_OVERVIEW_WIDGET_PLUGIN_TYPE,
} from "./config";

export const PHI_PROFILE_OVERVIEW_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<Record<string, never>> = {
  ...PHI_PROFILE_OVERVIEW_WIDGET_DEFINITION,
  render: ({ widget, runtime }) => (
    <PhiProfileOverviewWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
    />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};

export { PHI_PROFILE_OVERVIEW_WIDGET_PLUGIN_TYPE };
