import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
import {
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS,
  PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
  PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION,
  PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION,
} from "./widgets/chrome/config";
import {
  PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
} from "./widgets/chrome-controls/config";
import {
  PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
} from "./widgets/workspace-headers/config";
import {
  PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
  PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
} from "./widgets/workspaces/config";
import {
  PHI_HELLO_WORLD_WIDGET_DEFINITION,
} from "./widgets/hello-world/config";
import {
  PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
} from "./widgets/structure-region/config";
import {
  PHI_TEST_BLOCK_WIDGET_DEFINITION,
} from "./widgets/test-block/config";

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
    definition: PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/inspector-header/plugin").then((module) => module.PHI_BUILDER_INSPECTOR_HEADER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/inspector-header/plugin").then((module) => module.PHI_BUILDER_INSPECTOR_HEADER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/chrome-controls/plugin").then((module) => module.PHI_BUILDER_CHROME_CONTROLS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/chrome-controls/plugin").then((module) => module.PHI_BUILDER_CHROME_CONTROLS_WIDGET_PLUGIN),
  }),
  ...PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS.map(({ definition, spec }) => defineFirstPartyWidget({
    definition,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
    loadRuntime: () => import("./widgets/inspector-section/plugin").then((module) => module.createPhiBuilderInspectorSectionWidgetPlugin(definition, spec)),
    loadPreview: () => import("./widgets/inspector-section/plugin").then((module) => module.createPhiBuilderInspectorSectionWidgetPlugin(definition, spec)),
  })),
  defineFirstPartyWidget({
    definition: PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/mode-switch/plugin").then((module) => module.PHI_BUILDER_MODE_SWITCH_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/mode-switch/plugin").then((module) => module.PHI_BUILDER_MODE_SWITCH_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"visualSkeleton","authoring":"usePreview"},
    loadRuntime: () => import("./widgets/pages-workspace/plugin").then((module) => module.PHI_BUILDER_PAGES_WORKSPACE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/pages-workspace/preview-plugin").then((module) => module.PHI_BUILDER_PAGES_WORKSPACE_WIDGET_PREVIEW_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"visualSkeleton","authoring":"usePreview"},
    loadRuntime: () => import("./widgets/shells-workspace/plugin").then((module) => module.PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/shells-workspace/preview-plugin").then((module) => module.PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_PREVIEW_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/draft-status/plugin").then((module) => module.PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/draft-status/plugin").then((module) => module.PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/developer-builder-pages-header/plugin").then((module) => module.PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/developer-builder-pages-header/plugin").then((module) => module.PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_HELLO_WORLD_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/hello-world/plugin").then((module) => module.PHI_HELLO_WORLD_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/hello-world/plugin").then((module) => module.PHI_HELLO_WORLD_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/structure-region/plugin").then((module) => module.PHI_STRUCTURE_REGION_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/structure-region/plugin").then((module) => module.PHI_STRUCTURE_REGION_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_TEST_BLOCK_WIDGET_DEFINITION,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/test-block/plugin").then((module) => module.PHI_TEST_BLOCK_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/test-block/plugin").then((module) => module.PHI_TEST_BLOCK_WIDGET_PLUGIN),
  }),
] as const;
