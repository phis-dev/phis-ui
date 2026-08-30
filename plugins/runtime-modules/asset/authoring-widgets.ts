"use client";


import {
  PHI_AREA_UPLOAD_WIDGET_DEFINITION,
} from "./widgets/area-upload/config";
import {
  PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
} from "./widgets/image-inspector/config";
import {
  PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
} from "./widgets/asset-focal-rect/config";
import {
  PHI_MEDIA_PICKER_WIDGET_DEFINITION,
} from "./widgets/media-picker/config";
import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "../client-authoring-widget-module";

export default createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    PHI_AREA_UPLOAD_WIDGET_DEFINITION,
    () => import("./widgets/area-upload/authoring").then((module) => module.PHI_AREA_UPLOAD_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
    () => import("./widgets/image-inspector/authoring").then((module) => module.PHI_IMAGE_INSPECTOR_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
    () => import("./widgets/asset-focal-rect/authoring").then((module) => module.PHI_ASSET_FOCAL_RECT_WIDGET_BUILDER_PLUGIN),
  ),
  definePhiAuthoringWidgetModuleLoader(
    PHI_MEDIA_PICKER_WIDGET_DEFINITION,
    () => import("./widgets/media-picker/authoring").then((module) => module.PHI_MEDIA_PICKER_WIDGET_BUILDER_PLUGIN),
  ),
]);
