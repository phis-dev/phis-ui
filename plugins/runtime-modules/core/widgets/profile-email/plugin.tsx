import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PhiProfileEmailWidget } from "./server";
import { PHI_PROFILE_EMAIL_WIDGET_DEFINITION, PHI_PROFILE_EMAIL_WIDGET_PLUGIN_TYPE } from "./config";

export const PHI_PROFILE_EMAIL_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_PROFILE_EMAIL_WIDGET_DEFINITION,
  render: ({ widget, runtime, config }) => (
    <PhiProfileEmailWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      config={config}
    />
  ),
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};

export { PHI_PROFILE_EMAIL_WIDGET_PLUGIN_TYPE };
