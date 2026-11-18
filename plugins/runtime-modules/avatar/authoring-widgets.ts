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
    () => Promise.resolve(PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
    () => Promise.resolve(PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION),
  ),
]);
