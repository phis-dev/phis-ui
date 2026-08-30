import type { PhiCmsPreviewWidgetPlugin } from "../../../../../types";
import { PhiBuilderWorkspacePreviewSkeleton } from "../../../../../components/widgets/built-in/builder-workspace-preview";
import { PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION } from "../workspaces/config";

export const PHI_BUILDER_PAGES_WORKSPACE_WIDGET_PREVIEW_PLUGIN: PhiCmsPreviewWidgetPlugin<Record<string, never>> = {
  ...PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
  renderPreview: () => <PhiBuilderWorkspacePreviewSkeleton kind="pages" />,
};
