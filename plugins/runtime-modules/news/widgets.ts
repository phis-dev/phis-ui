import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_NEWS_LIST_WIDGET_DEFINITION } from "./widgets/news-list/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_NEWS_RUNTIME_MODULE_WIDGETS = [
  defineFirstPartyWidget({
    definition: PHI_NEWS_LIST_WIDGET_DEFINITION,
    ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/news-list/plugin")
      .then((module) => module.PHI_NEWS_LIST_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/news-list/plugin")
      .then((module) => module.PHI_NEWS_LIST_WIDGET_PLUGIN),
  }),
] as const;
