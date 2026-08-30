import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiDeveloperBuilderDraftStatusWidget } from "../../../../../components/widgets/server/builder-chrome";
import { PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION, type PhiBuilderChromeWidgetConfig } from "../chrome/config";

export const PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig> = {
  ...PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION,
  render: ({ runtime }) => <PhiDeveloperBuilderDraftStatusWidget runtime={runtime} />,
  renderPreview: ({ runtime }) => <PhiDeveloperBuilderDraftStatusWidget runtime={runtime} />,
};
