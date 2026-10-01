"use client";

import type { PhiRuntimeModuleAuthoringClientContribution } from "./plugins/runtime-modules/authoring-contributions-client";
import type { PhiRuntimeModuleId } from "./types/cms-module-descriptors";
import type { PhiSiteModuleAuthoringContributions } from "./plugins/runtime-modules/site-modules-authoring-client";
import {
  readPhiSiteModulePlacements,
  type PhiSiteModulePlacement,
} from "./plugins/runtime-modules/site-module-placements";

/**
 * The Authoring counterpart of `collectPhiSiteModuleClientContributions`, called by its own generated
 * file so that no live Area graph can reach an Authoring implementation through an import.
 *
 * Every Module must bring an Authoring contribution, including one that owns nothing to author. A
 * missing loader is a hard failure at render time -- refused here instead, where the package is
 * composed and the author can still see which Module it is. The Modules are the generator's placements,
 * every installed one regardless of Area, because the Builder authors pages for all of them; reading
 * them from the packages' definitions would bring each definition into the Builder's bundle.
 */
export function collectPhiSiteModuleAuthoringContributions(input: {
  placements: readonly PhiSiteModulePlacement[];
  authoring: readonly PhiRuntimeModuleAuthoringClientContribution[];
}): PhiSiteModuleAuthoringContributions {
  const authoringModuleIds = new Set(input.authoring.map((contribution) => contribution.moduleId));
  const definedModuleIds = new Set<PhiRuntimeModuleId>(
    readPhiSiteModulePlacements(input.placements).keys(),
  );
  for (const moduleId of definedModuleIds) {
    if (!authoringModuleIds.has(moduleId)) {
      throw new Error(
        `Module "${moduleId}" has no Authoring contribution. A Module with nothing to author ` +
        "registers an empty Widget module rather than omitting one.",
      );
    }
  }

  /* One per Module, in the order the package composed them, and none for a Module nothing defined. */
  const byModuleId = new Map<PhiRuntimeModuleId, PhiRuntimeModuleAuthoringClientContribution>();
  for (const contribution of input.authoring) {
    if (definedModuleIds.has(contribution.moduleId) && !byModuleId.has(contribution.moduleId)) {
      byModuleId.set(contribution.moduleId, contribution);
    }
  }

  return { authoring: [...byModuleId.values()] };
}
