"use client";

import {
  PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION,
} from "./widgets/account-avatar/config";
import {
  PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
} from "./widgets/account-avatar-picker/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION,
    () => import("./widgets/account-avatar/authoring").then((module) => module.PHI_ACCOUNT_AVATAR_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
    () => import("./widgets/account-avatar-picker/authoring").then((module) => module.PHI_ACCOUNT_AVATAR_PICKER_WIDGET_BUILDER_PLUGIN),
  ),
]);
