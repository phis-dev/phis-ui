import { PHI_AVATAR_RUNTIME_MODULE_ID } from "./ids";
import type { PhiCmsAreaOverlayPresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_AVATAR_OVERLAY_IDS } from "./addresses";

export const PHI_AVATAR_RUNTIME_MODULE_AREA_OVERLAYS = [{
  ownerModuleId: PHI_AVATAR_RUNTIME_MODULE_ID,
  presetKey: PHI_AVATAR_OVERLAY_IDS.presetKey,
  presetVersion: 1,
  area: "app",
  loadTree: async ({ page, runtime }) => {
    const { buildPhiAvatarAreaPickerOverlayTree } = await import("./overlay-tree.server");
    return buildPhiAvatarAreaPickerOverlayTree({ page, runtime });
  },
}] satisfies readonly PhiCmsAreaOverlayPresetDescriptor[];
