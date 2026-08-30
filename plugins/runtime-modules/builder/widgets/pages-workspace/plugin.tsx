import type { PhiCmsRuntimeWidgetPlugin } from "../../../../../types";
import { PhiDeveloperBuilderPagesWorkspaceWidget } from "../../../../../plugins/runtime-modules/builder/pages-workspace";
import { PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION } from "../workspaces/config";

export const PHI_BUILDER_PAGES_WORKSPACE_WIDGET_PLUGIN: PhiCmsRuntimeWidgetPlugin<Record<string, never>> = {
  ...PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
  render: ({ runtime, registry }) => {
    if (!registry) {
      throw new Error("Builder Pages Workspace requires the resolved runtime registry.");
    }
    return <PhiDeveloperBuilderPagesWorkspaceWidget runtime={runtime} registry={registry} />;
  },
};
