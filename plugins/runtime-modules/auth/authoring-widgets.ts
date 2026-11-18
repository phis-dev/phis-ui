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
    () => Promise.resolve(PHI_AUTH_LOGOUT_WIDGET_DEFINITION),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_SECURITY_WIDGET_DEFINITION,
    () => Promise.resolve(PHI_AUTH_SECURITY_WIDGET_DEFINITION),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_WORKFLOW_WIDGET_DEFINITION,
    () => Promise.resolve(PHI_AUTH_WORKFLOW_WIDGET_DEFINITION),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_AUTH_METHODS_WIDGET_DEFINITION,
    () => Promise.resolve(PHI_AUTH_METHODS_WIDGET_DEFINITION),
  ),
]);
