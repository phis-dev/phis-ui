"use client";

import { PHI_THREAD_COMPOSER_WIDGET_DEFINITION } from "./widgets/thread-composer/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_THREAD_COMPOSER_WIDGET_DEFINITION,
    () => import("./widgets/thread-composer/authoring").then((module) => module.PHI_THREAD_COMPOSER_WIDGET_BUILDER_PLUGIN),
  ),
]);
