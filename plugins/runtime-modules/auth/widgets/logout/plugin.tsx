import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_AUTH_LOGOUT_WIDGET_DEFINITION } from "./config";
import { PhiAuthLogoutWidget } from "./server";

export const PHI_AUTH_LOGOUT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_AUTH_LOGOUT_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiAuthLogoutWidget runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
