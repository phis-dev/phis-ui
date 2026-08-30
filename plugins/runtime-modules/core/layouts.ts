import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";
import type { PhiCmsLayoutPlugin, PhiCmsLayoutPluginDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleLayoutDefinition } from "../contracts";
import {
  PHI_COLLAPSIBLE_LAYOUT_DEFINITION,
  PHI_CONTENT_LAYOUT_DEFINITION,
  PHI_FLEX_LAYOUT_DEFINITION,
  PHI_FLEX_VERTICAL_LAYOUT_DEFINITION,
  PHI_FORM_LAYOUT_DEFINITION,
  PHI_GRID_LAYOUT_DEFINITION,
  PHI_MASONRY_LAYOUT_DEFINITION,
  PHI_SPLIT_CARD_LAYOUT_DEFINITION,
  PHI_STACK_LAYOUT_DEFINITION,
  PHI_THREE_COLUMN_LAYOUT_DEFINITION,
} from "../../../components/layouts/layout-definitions";

const RENDER_POLICIES = {
  runtime: "custom",
  preview: "runtimeReadOnly",
  authoring: "custom",
} as const;

function defineCoreLayout<TConfig>(
  definition: PhiCmsLayoutPluginDefinition<TConfig>,
  load: () => Promise<PhiCmsLayoutPlugin<TConfig>>,
): PhiRuntimeModuleLayoutDefinition {
  return {
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    definition: definition as PhiCmsLayoutPluginDefinition<unknown>,
    renderPolicies: RENDER_POLICIES,
    loadRuntime: load as () => Promise<PhiCmsLayoutPlugin<unknown>>,
  };
}

export const PHI_RUNTIME_MODULE_LAYOUTS: readonly PhiRuntimeModuleLayoutDefinition[] = [
  defineCoreLayout(PHI_CONTENT_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/content-layout-plugin").then((module) => module.PHI_CONTENT_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_FORM_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/form-layout-plugin").then((module) => module.PHI_FORM_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_FLEX_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/flex-layout-plugin").then((module) => module.PHI_FLEX_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_FLEX_VERTICAL_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/flex-vertical-layout-plugin").then((module) => module.PHI_FLEX_VERTICAL_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_COLLAPSIBLE_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/collapsible-layout-plugin").then((module) => module.PHI_COLLAPSIBLE_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_STACK_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/stack-layout-plugin").then((module) => module.PHI_STACK_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_GRID_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/grid-layout-plugin").then((module) => module.PHI_GRID_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_MASONRY_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/masonry-layout-plugin").then((module) => module.PHI_MASONRY_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_SPLIT_CARD_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/split-card-layout-plugin").then((module) => module.PHI_SPLIT_CARD_LAYOUT_PLUGIN)),
  defineCoreLayout(PHI_THREE_COLUMN_LAYOUT_DEFINITION, () => import("../../../components/layouts/plugins/three-column-layout-plugin").then((module) => module.PHI_THREE_COLUMN_LAYOUT_PLUGIN)),
] as const;
