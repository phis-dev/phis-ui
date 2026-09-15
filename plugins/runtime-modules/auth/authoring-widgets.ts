"use client";

import { PHI_AUTH_LOGOUT_WIDGET_DEFINITION } from "./widgets/logout/config";
import { PHI_AUTH_SECURITY_WIDGET_DEFINITION } from "./widgets/security/config";
import { PHI_AUTH_WORKFLOW_WIDGET_DEFINITION } from "./widgets/auth-workflow/config";
import { PHI_AUTH_METHODS_WIDGET_DEFINITION } from "./widgets/auth-methods/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_LOGOUT_WIDGET_DEFINITION,
    () => import("./widgets/logout/authoring")
      .then((module) => module.PHI_AUTH_LOGOUT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_SECURITY_WIDGET_DEFINITION,
    () => import("./widgets/security/authoring")
      .then((module) => module.PHI_AUTH_SECURITY_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
    () => import("./widgets/auth-workflow/authoring")
      .then((module) => module.PHI_AUTH_WORKFLOW_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_METHODS_WIDGET_DEFINITION,
    () => import("./widgets/auth-methods/authoring")
      .then((module) => module.PHI_AUTH_METHODS_WIDGET_BUILDER_PLUGIN),
  ),
]);
