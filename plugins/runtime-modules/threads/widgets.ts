import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_THREAD_COMPOSER_WIDGET_DEFINITION } from "./widgets/thread-composer/config";
import { PHI_THREAD_CONVERSATION_WIDGET_DEFINITION } from "./widgets/thread-conversation/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_THREADS_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_THREAD_COMPOSER_WIDGET_DEFINITION,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/thread-composer/plugin").then((module) => module.PHI_THREAD_COMPOSER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/thread-composer/plugin").then((module) => module.PHI_THREAD_COMPOSER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_THREAD_CONVERSATION_WIDGET_DEFINITION,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/thread-conversation/plugin").then((module) => module.PHI_THREAD_CONVERSATION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/thread-conversation/plugin").then((module) => module.PHI_THREAD_CONVERSATION_WIDGET_PLUGIN),
  }),
] as const;
