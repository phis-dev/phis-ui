import {
  createPhiPresetCmsInstanceId,
  type PhiCmsInstanceId,
} from "../../../types/cms-instance-id";

export function createPhiCommandToolbarId(
  ownerModuleId: string,
  presetKey: string,
): PhiCmsInstanceId {
  return createPhiPresetCmsInstanceId({
    domain: "area",
    ownerModuleId,
    presetKey,
    nodeKey: "widgetToolbar",
  });
}
