import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import type { PhiThreadWidgetConfig } from "../thread-widget-config";
import { PHI_THREAD_CONVERSATION_WIDGET_DEFINITION } from "./config";
import { PhiThreadConversationWidget } from "./server";

export const PHI_THREAD_CONVERSATION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiThreadWidgetConfig> = {
  ...PHI_THREAD_CONVERSATION_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiThreadConversationWidget runtime={runtime} config={config} />,
};
