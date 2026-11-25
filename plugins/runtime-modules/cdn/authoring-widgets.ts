"use client";

import { PHI_CDN_UPLOAD_WIDGET_DEFINITION } from "./widgets/upload/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

/** The upload has no settings and nothing to draw before a file is chosen, so its definition is all. */
export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_CDN_UPLOAD_WIDGET_DEFINITION,
    () => Promise.resolve(PHI_CDN_UPLOAD_WIDGET_DEFINITION),
  ),
]);
