import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import type { PhiCmsAreaOverlayPresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_AUTH_LOGIN_OVERLAY_IDS } from "../../runtime/auth-overlay-ids";

export const PHI_AUTH_RUNTIME_MODULE_AREA_OVERLAYS = (["public", "app"] as const).map((area) => ({
  ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
  presetKey: PHI_AUTH_LOGIN_OVERLAY_IDS[area].presetKey,
  presetVersion: 1,
  area,
  loadTree: async ({ page, runtime }) => {
    const { buildPhiAuthAreaLoginOverlayTree } = await import("./phi-auth-area-overlay-tree.server");
    return buildPhiAuthAreaLoginOverlayTree({ page, runtime, area });
  },
})) satisfies readonly PhiCmsAreaOverlayPresetDescriptor[];
