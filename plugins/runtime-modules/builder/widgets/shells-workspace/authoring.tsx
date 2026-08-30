"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION } from "../workspaces/config";
import { PhiBuilderWorkspacePreviewSkeleton } from "../../../../../components/widgets/built-in/builder-workspace-preview";

export const PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<Record<string, never>> = {
  ...PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
  renderEditor: () => <PhiBuilderWorkspacePreviewSkeleton kind="shells" />,
};
