import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_THREAD_CONVERSATION_WIDGET_DEFINITION } from "./config";
import { PhiThreadConversationWidget } from "./server";

export const PHI_THREAD_CONVERSATION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_THREAD_CONVERSATION_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiThreadConversationWidget runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
