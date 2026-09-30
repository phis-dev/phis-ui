import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

const PHI_BUILDER_MEDIA_PAGE_ID_CONTEXT = {
  domain: "page" as const,
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "builder-media-page",
};

export const PHI_ASSET_INSPECTOR_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_BUILDER_MEDIA_PAGE_ID_CONTEXT,
  ["overlayMediaInspector", "overlayMediaFocalRect", "overlayMediaFolderCreate"],
);

export const PHI_ASSET_INSPECTOR_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_BUILDER_MEDIA_PAGE_ID_CONTEXT,
  [
    "layoutMediaInspectorHeader",
    "layoutMediaInspector",
    "layoutMediaInspectorFooter",
    "layoutMediaFocalRectBody",
    "layoutMediaFocalRectFooter",
    "layoutMediaFolderCreateBody",
    "layoutMediaFolderCreateFooter",
  ],
);

export const PHI_ASSET_INSPECTOR_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_BUILDER_MEDIA_PAGE_ID_CONTEXT,
  [
    "widgetMediaMetadataForm",
    "widgetMediaInspectorCommands",
    "widgetMediaFocalRect",
    "widgetMediaFocalRectCommands",
    "widgetMediaFolderCreateForm",
    "widgetMediaFolderCreateCommands",
  ],
);

export const PHI_ASSET_MEDIA_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "builder-media-page",
}, ["widgetMediaPreview", "widgetMediaInspector"]);

/** The Page's own frame: the header bottom it keeps empty and the root its gallery stands in. */
export const PHI_ASSET_MEDIA_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  presetKey: "builder-media-page",
}, ["layoutHeaderBottom", "layoutContent"]);
