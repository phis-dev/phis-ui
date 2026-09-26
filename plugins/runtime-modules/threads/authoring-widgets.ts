"use client";

import { PHI_THREAD_CONVERSATION_WIDGET_DEFINITION } from "./widgets/thread-conversation/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_THREAD_CONVERSATION_WIDGET_DEFINITION,
    () => import("./widgets/thread-conversation/authoring").then((module) => module.PHI_THREAD_CONVERSATION_WIDGET_BUILDER_PLUGIN),
  ),
]);
