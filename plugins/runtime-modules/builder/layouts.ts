import type { PhiCmsLayoutPlugin, PhiCmsLayoutPluginDefinition } from "../../../types/cms-plugins";
import {
  PHI_PAGE_REGION_LAYOUT_DEFINITION,
  PHI_STRUCTURE_REGION_LAYOUT_DEFINITION,
} from "../../../components/layouts/layout-definitions";
import type { PhiRuntimeModuleLayoutDefinition } from "../contracts";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";

const RENDER_POLICIES = {
  runtime: "custom",
  preview: "runtimeReadOnly",
  authoring: "custom",
} as const;

function defineBuilderLayout<TConfig>(
  definition: PhiCmsLayoutPluginDefinition<TConfig>,
  load: () => Promise<PhiCmsLayoutPlugin<TConfig>>,
): PhiRuntimeModuleLayoutDefinition {
  return {
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    definition: definition as PhiCmsLayoutPluginDefinition<unknown>,
    renderPolicies: RENDER_POLICIES,
    loadRuntime: load as () => Promise<PhiCmsLayoutPlugin<unknown>>,
  };
}

export const PHI_BUILDER_RUNTIME_MODULE_LAYOUTS: readonly PhiRuntimeModuleLayoutDefinition[] = [
  defineBuilderLayout(
    PHI_STRUCTURE_REGION_LAYOUT_DEFINITION,
    () => import("../../../components/layouts/plugins/structure-region-layout-plugin")
      .then((module) => module.PHI_STRUCTURE_REGION_LAYOUT_PLUGIN),
  ),
  defineBuilderLayout(
    PHI_PAGE_REGION_LAYOUT_DEFINITION,
    () => import("../../../components/layouts/plugins/page-region-layout-plugin")
      .then((module) => module.PHI_PAGE_REGION_LAYOUT_PLUGIN),
  ),
];
