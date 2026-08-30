import {
  createPhiPresetCmsInstanceId,
  type PhiCmsInstanceId,
} from "../../../types/cms-instance-id";
import {
  createPhiSignalSubcontrolAddress,
  type PhiSignalAddress,
} from "../../../types/signals";

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

export function createPhiCommandToolbarControlAddress(
  ownerModuleId: string,
  presetKey: string,
  controlKey: "undo" | "redo",
): PhiSignalAddress {
  return createPhiSignalSubcontrolAddress(
    "cms",
    createPhiCommandToolbarId(ownerModuleId, presetKey),
    controlKey,
  );
}
