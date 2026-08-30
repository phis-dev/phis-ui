import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import {
  PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
} from "./widgets/brand-controls/config";

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/brand-controls/plugin").then((module) => module.PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_PLUGIN),
  }),
] as const;
