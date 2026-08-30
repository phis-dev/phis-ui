"use client";

import { PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION } from "./widgets/log-detail/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_DEFINITION,
    () => import("./widgets/log-detail/authoring")
      .then((module) => module.PHI_OBSERVABILITY_LOG_DETAIL_WIDGET_BUILDER_PLUGIN),
  ),
]);
