import { PHI_AVATAR_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/avatar/ids";
import { createPhiPresetCmsInstanceIdMap } from "../../types/cms-instance-id";

/**
 * The Avatar Module's Area-owned Overlay.
 *
 * Area-owned rather than Page-owned so it exists wherever the App is: a Page-owned Overlay would only
 * be reachable while its own Page is the current tree, which is not what "change my picture" means.
 * Ids come from the preset-id factory, so they survive an Area revision and can be addressed by a
 * Widget that was rendered from a different preset.
 */
const PRESET_KEY = "avatar-app-picker-overlay";

export const PHI_AVATAR_OVERLAY_IDS = {
  presetKey: PRESET_KEY,
  ...createPhiPresetCmsInstanceIdMap({
    domain: "area",
    ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
    presetKey: PRESET_KEY,
  }, ["overlayPicker", "layoutBody", "widgetUpload", "widgetPicker"]),
} as const;
