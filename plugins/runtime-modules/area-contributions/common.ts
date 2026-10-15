import { createPhiAssetRuntimeModuleServerAreaContribution } from "../asset/server";
import { createPhiCoreRuntimeModuleServerAreaContribution } from "../core/server";
import { createPhiThreadsRuntimeModuleServerAreaContribution } from "../threads/server";

/**
 * The modules every Area carries, contributed whole; the Area catalog cuts them to itself.
 *
 * Conversations among them because they are how people on a Site talk to each other, wherever they are
 * standing -- not a feature of the App.
 */
export function createPhiCommonRuntimeModuleServerAreaContributions() {
  return [
    createPhiCoreRuntimeModuleServerAreaContribution(),
    createPhiAssetRuntimeModuleServerAreaContribution(),
    createPhiThreadsRuntimeModuleServerAreaContribution(),
  ] as const;
}
