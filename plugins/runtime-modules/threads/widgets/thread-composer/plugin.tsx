import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_THREAD_COMPOSER_WIDGET_DEFINITION } from "./config";
import { PhiThreadComposerWidget } from "./server";

export const PHI_THREAD_COMPOSER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_THREAD_COMPOSER_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiThreadComposerWidget runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
