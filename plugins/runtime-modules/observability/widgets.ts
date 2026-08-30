import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import { PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION } from "./widgets/log-detail/config";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_OBSERVABILITY_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION,
    ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/log-detail/plugin")
      .then((module) => module.PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/log-detail/plugin")
      .then((module) => module.PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_PLUGIN),
  }),
] as const;
