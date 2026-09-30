import type { PhiCmsAreaOverlayPresetDescriptor } from "../../../../types/cms-module-descriptors";
import { PHI_BUILDER_INSPECTOR_OVERLAY_PRESET_KEY } from "../inspector-overlay-addresses";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../ids";

export const PHI_BUILDER_RUNTIME_MODULE_AREA_OVERLAYS = [{
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: PHI_BUILDER_INSPECTOR_OVERLAY_PRESET_KEY,
  presetVersion: 1,
  area: "builder",
  loadTree: async ({ page, runtime }) => {
    const { buildPhiBuilderInspectorAreaOverlayTree } = await import("./phi-builder-inspector-area-overlay-tree.server");
    return buildPhiBuilderInspectorAreaOverlayTree({ page, runtime });
  },
}] satisfies readonly PhiCmsAreaOverlayPresetDescriptor[];
