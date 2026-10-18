import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_TOUR_RUNTIME_MODULE_ID } from "./ids";
import { PHI_TOUR_BUTTON_WIDGET_DEFINITION } from "./widgets/tour-button/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_TOUR_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_TOUR_BUTTON_WIDGET_DEFINITION,
    ownerModuleId: PHI_TOUR_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/tour-button/plugin").then((module) => module.PHI_TOUR_BUTTON_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/tour-button/plugin").then((module) => module.PHI_TOUR_BUTTON_WIDGET_PLUGIN),
  }),
] as const;
