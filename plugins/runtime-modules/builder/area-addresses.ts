import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";

export const PHI_BUILDER_STRUCTURE_RUNTIME_MODULES_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "area",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
  nodeKey: "widgetStructureRuntimeModules",
});
