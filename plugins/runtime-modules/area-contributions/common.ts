import { createPhiAssetRuntimeModuleServerAreaContribution } from "../asset/server";
import { createPhiCoreRuntimeModuleServerAreaContribution } from "../core/server";

/** The two modules every Area carries, contributed whole; the Area catalog cuts them to itself. */
export function createPhiCommonRuntimeModuleServerAreaContributions() {
  return [
    createPhiCoreRuntimeModuleServerAreaContribution(),
    createPhiAssetRuntimeModuleServerAreaContribution(),
  ] as const;
}
