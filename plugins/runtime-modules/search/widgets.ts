import { PHI_SEARCH_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";
import { PHI_SEARCH_BOX_WIDGET_DEFINITION } from "./widgets/search-box/config";
import { PHI_SEARCH_RESULTS_WIDGET_DEFINITION } from "./widgets/search-results/config";
import { definePhiFirstPartyWidget } from "../contracts";

export const PHI_SEARCH_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  definePhiFirstPartyWidget({
    definition: PHI_SEARCH_BOX_WIDGET_DEFINITION,
    ownerModuleId: PHI_SEARCH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/search-box/plugin").then((module) => module.PHI_SEARCH_BOX_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/search-box/plugin").then((module) => module.PHI_SEARCH_BOX_WIDGET_PLUGIN),
  }),
  definePhiFirstPartyWidget({
    definition: PHI_SEARCH_RESULTS_WIDGET_DEFINITION,
    ownerModuleId: PHI_SEARCH_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/search-results/plugin").then((module) => module.PHI_SEARCH_RESULTS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/search-results/plugin").then((module) => module.PHI_SEARCH_RESULTS_WIDGET_PLUGIN),
  }),
] as const;
