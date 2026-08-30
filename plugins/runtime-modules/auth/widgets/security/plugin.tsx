import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_AUTH_SECURITY_WIDGET_DEFINITION } from "./config";
import { PhiAuthSecurityWidget } from "./server";

export const PHI_AUTH_SECURITY_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_AUTH_SECURITY_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiAuthSecurityWidget runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
