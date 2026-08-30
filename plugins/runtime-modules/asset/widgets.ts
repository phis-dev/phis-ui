import type { PhiCmsWidgetPluginDefinition } from "../../../types/builder";
import type { PhiCmsPreviewWidgetPlugin, PhiCmsRuntimeWidgetPlugin } from "../../../types/cms-plugins";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import type { PhiRuntimeModuleRenderPolicies, PhiRuntimeModuleWidgetDefinition } from "../contracts";
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

function defineFirstPartyWidget<TConfig>(options: {
  definition: PhiCmsWidgetPluginDefinition<TConfig>;
  ownerModuleId: `${string}/${string}`;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  loadRuntime: () => Promise<PhiCmsRuntimeWidgetPlugin<TConfig>>;
  loadPreview: () => Promise<PhiCmsPreviewWidgetPlugin<TConfig>>;
}): PhiRuntimeModuleWidgetDefinition {
  return options as PhiRuntimeModuleWidgetDefinition;
}

export const PHI_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [
  defineFirstPartyWidget({
    definition: PHI_AREA_UPLOAD_WIDGET_DEFINITION,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/area-upload/plugin").then((module) => module.PHI_AREA_UPLOAD_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/area-upload/plugin").then((module) => module.PHI_AREA_UPLOAD_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/image-inspector/plugin").then((module) => module.PHI_IMAGE_INSPECTOR_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/image-inspector/plugin").then((module) => module.PHI_IMAGE_INSPECTOR_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/asset-focal-rect/plugin").then((module) => module.PHI_ASSET_FOCAL_RECT_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/asset-focal-rect/plugin").then((module) => module.PHI_ASSET_FOCAL_RECT_WIDGET_PLUGIN),
  }),
  defineFirstPartyWidget({
    definition: PHI_MEDIA_PICKER_WIDGET_DEFINITION,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    renderPolicies: {"runtime":"custom","preview":"custom","authoring":"custom"},
    loadRuntime: () => import("./widgets/media-picker/plugin").then((module) => module.PHI_MEDIA_PICKER_WIDGET_PLUGIN),
    loadPreview: () => import("./widgets/media-picker/plugin").then((module) => module.PHI_MEDIA_PICKER_WIDGET_PLUGIN),
  }),
] as const;
