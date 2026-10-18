"use client";

import { PHI_TOUR_BUTTON_WIDGET_DEFINITION } from "./widgets/tour-button/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_TOUR_BUTTON_WIDGET_DEFINITION,
    () => import("./widgets/tour-button/authoring").then((module) => module.PHI_TOUR_BUTTON_WIDGET_BUILDER_PLUGIN),
  ),
]);
