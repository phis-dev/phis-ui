import type { PhiCmsRuntimeWidgetPlugin } from "../../../../../types";
import { PhiDeveloperBuilderShellsWorkspaceWidget } from "../../../../../plugins/runtime-modules/builder/shells-workspace";
import { PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION } from "../workspaces/config";

export const PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_PLUGIN: PhiCmsRuntimeWidgetPlugin<Record<string, never>> = {
  ...PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
  render: ({ runtime, registry }) => {
    if (!registry) {
      throw new Error("Builder Shells Workspace requires the resolved runtime registry.");
    }
    return <PhiDeveloperBuilderShellsWorkspaceWidget runtime={runtime} registry={registry} />;
  },
};
