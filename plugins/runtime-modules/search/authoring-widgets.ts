"use client";

import { PHI_SEARCH_BOX_WIDGET_DEFINITION } from "./widgets/search-box/config";
import { PHI_SEARCH_RESULTS_WIDGET_DEFINITION } from "./widgets/search-results/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_SEARCH_BOX_WIDGET_DEFINITION,
    () => import("./widgets/search-box/authoring").then((module) => module.PHI_SEARCH_BOX_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_SEARCH_RESULTS_WIDGET_DEFINITION,
    () => import("./widgets/search-results/authoring").then((module) => module.PHI_SEARCH_RESULTS_WIDGET_BUILDER_PLUGIN),
  ),
]);
