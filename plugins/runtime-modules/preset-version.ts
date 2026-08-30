import type { PhiCmsPresetSource } from "../../types/cms-module-descriptors";

export function hasPhiCmsPresetUpdate(
  installedSource: PhiCmsPresetSource | null | undefined,
  snapshotSource: PhiCmsPresetSource | null | undefined,
) {
  return installedSource != null &&
    snapshotSource != null &&
    installedSource.ownerModuleId === snapshotSource.ownerModuleId &&
    installedSource.presetKey === snapshotSource.presetKey &&
    installedSource.sourcePresetVersion > snapshotSource.sourcePresetVersion;
}
