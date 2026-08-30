import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiBuilderModeSwitchWidget } from "../../../../../components/widgets/server/builder-chrome";
import { PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION, type PhiBuilderChromeWidgetConfig } from "../chrome/config";

export const PHI_BUILDER_MODE_SWITCH_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig> = {
  ...PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION,
  render: ({ runtime }) => <PhiBuilderModeSwitchWidget runtime={runtime} />,
  renderPreview: ({ runtime }) => <PhiBuilderModeSwitchWidget runtime={runtime} disabled />,
};
