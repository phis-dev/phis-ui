"use client";

import type { PhiModuleDefinitions } from "./module";
import type { PhiRuntimeModuleAuthoringClientContribution } from "./plugins/runtime-modules/authoring-contributions-client";
import type { PhiRuntimeModuleId } from "./types/cms-module-descriptors";
import type { PhiSiteModuleAuthoringContributions } from "./plugins/runtime-modules/site-modules-authoring-client";

/**
 * The Authoring counterpart of `collectPhiSiteModuleClientContributions`, called by its own generated
 * file so that no live Area graph can reach an Authoring implementation through an import.
 *
 * Every Module must bring an Authoring contribution, including one that owns nothing to author. A
 * missing loader is a hard failure at render time -- refused here instead, where the package is
 * composed and the author can still see which Module it is.
 */
export function collectPhiSiteModuleAuthoringContributions(input: {
  definitions: PhiModuleDefinitions;
  authoring: readonly PhiRuntimeModuleAuthoringClientContribution[];
}): PhiSiteModuleAuthoringContributions {
  const authoringModuleIds = new Set(input.authoring.map((contribution) => contribution.moduleId));
  for (const definition of input.definitions) {
    if (!authoringModuleIds.has(definition.moduleId)) {
      throw new Error(
        `Module "${definition.moduleId}" has no Authoring contribution. A Module with nothing to author ` +
        "registers an empty Widget module rather than omitting one.",
      );
    }
  }

  const definedModuleIds = new Set<PhiRuntimeModuleId>(
    input.definitions.map((definition) => definition.moduleId),
  );
  /* One per Module, in the order the package composed them, and none for a Module nothing defined. */
  const byModuleId = new Map<PhiRuntimeModuleId, PhiRuntimeModuleAuthoringClientContribution>();
  for (const contribution of input.authoring) {
    if (definedModuleIds.has(contribution.moduleId) && !byModuleId.has(contribution.moduleId)) {
      byModuleId.set(contribution.moduleId, contribution);
    }
  }

  return { authoring: [...byModuleId.values()] };
}
