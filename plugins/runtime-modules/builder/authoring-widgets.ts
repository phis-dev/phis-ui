"use client";


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
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION,
    () => import("./widgets/inspector-header/authoring").then((module) => module.PHI_BUILDER_INSPECTOR_HEADER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_CHROME_CONTROLS_WIDGET_DEFINITION,
    () => import("./widgets/chrome-controls/authoring").then((module) => module.PHI_BUILDER_CHROME_CONTROLS_WIDGET_BUILDER_PLUGIN),
  ),
  ...PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS.map(({ definition }) =>
    definePhiAuthoringWidgetModuleLoader(
      definition,
      () => import("./widgets/inspector-section/authoring").then((module) => module.createPhiBuilderInspectorSectionWidgetBuilderPlugin(definition)),
    )
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION,
    () => import("./widgets/mode-switch/authoring").then((module) => module.PHI_BUILDER_MODE_SWITCH_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION,
    () => import("./widgets/pages-workspace/authoring").then((module) => module.PHI_BUILDER_PAGES_WORKSPACE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION,
    () => import("./widgets/shells-workspace/authoring").then((module) => module.PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION,
    () => import("./widgets/draft-status/authoring-plugin").then((module) => module.PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
    () => import("./widgets/developer-builder-pages-header/authoring").then((module) => module.PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_HELLO_WORLD_WIDGET_DEFINITION,
    () => import("./widgets/hello-world/authoring").then((module) => module.PHI_HELLO_WORLD_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
    () => import("../../../components/widgets/builder/internal-builder").then((module) => module.PHI_STRUCTURE_REGION_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_TEST_BLOCK_WIDGET_DEFINITION,
    () => import("./widgets/test-block/authoring").then((module) => module.PHI_TEST_BLOCK_WIDGET_BUILDER_PLUGIN),
  ),
]);
