"use client";


import {
  PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
  PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
} from "./widgets/brand-controls/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION,
    () => import("./widgets/brand-controls/authoring").then((module) => module.PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION,
    () => import("./widgets/brand-controls/authoring").then((module) => module.PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION,
    () => import("./widgets/brand-controls/authoring").then((module) => module.PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_BUILDER_PLUGIN),
  ),
]);
