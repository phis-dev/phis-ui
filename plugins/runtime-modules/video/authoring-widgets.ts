"use client";

import { PHI_VIDEO_EMBED_WIDGET_DEFINITION } from "./widgets/embed/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_VIDEO_EMBED_WIDGET_DEFINITION,
    () => import("./widgets/embed/authoring").then((module) => module.PHI_VIDEO_EMBED_WIDGET_BUILDER_PLUGIN),
  ),
]);
