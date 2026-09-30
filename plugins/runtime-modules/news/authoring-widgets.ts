"use client";

import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";
import { PHI_NEWS_LIST_WIDGET_DEFINITION } from "./widgets/news-list/config";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_NEWS_LIST_WIDGET_DEFINITION,
    () => import("./widgets/news-list/authoring")
      .then((module) => module.PHI_NEWS_LIST_WIDGET_BUILDER_PLUGIN),
  ),
]);
