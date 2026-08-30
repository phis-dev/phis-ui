import { PHI_AVATAR_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/avatar/ids";
import type { PhiCmsAreaOverlayPresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_AVATAR_OVERLAY_IDS } from "../../runtime/avatar-overlay-ids";

export const PHI_AVATAR_RUNTIME_MODULE_AREA_OVERLAYS = [{
  ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
  presetKey: PHI_AVATAR_OVERLAY_IDS.presetKey,
  presetVersion: 1,
  area: "app",
  loadTree: async ({ page, runtime }) => {
    const { buildPhiAvatarAreaPickerOverlayTree } = await import("./phi-avatar-area-overlay-tree.server");
    return buildPhiAvatarAreaPickerOverlayTree({ page, runtime });
  },
}] satisfies readonly PhiCmsAreaOverlayPresetDescriptor[];
