import type { PhiCmsAreaKey } from "./constants/cms-areas";
import {
  definePhiRuntimeModuleServerAreaContribution,
  type PhiRuntimeModuleServerAreaContribution,
} from "./plugins/runtime-modules/area-contributions";
import type { PhiModuleServerContributions } from "./module";
import {
  readPhiSiteModulePlacements,
  requirePhiSiteModulePlacement,
  type PhiSiteModulePlacement,
} from "./plugins/runtime-modules/site-module-placements";
import type { PhiRuntimeModuleId } from "./types/cms-module-descriptors";
import type { PhiSiteModuleServerAreaContributions } from "./plugins/runtime-modules/site-modules";

/**
 * Turning what Module packages export into the per-Area projection a Site build resolves.
 *
 * This runs where the projection is imported, not where it is written. `phis-cli` generates a file that
 * imports the installed packages and calls this; it never loads a Module itself, which it could not do
 * anyway -- a Module's boundaries include TSX and Client code that has no business running inside a
 * command-line tool. The generated file therefore stays a list of imports, the placements it read from
 * each package's `package.json#phis`, and one call.
 *
 * The placement completes each definition: an installed Module's code names no Area, and from here on it
 * carries `eligibleAreas` like a first-party one. That is also where its descriptors are checked against
 * those Areas, which the package could not do itself (`definePhiRuntimeModuleServerAreaContribution`).
 *
 * Placement only -- the whole contribution goes into every Area the Module was admitted to, and the Area
 * catalog cuts it to the descriptors addressed to itself. The cut is one implementation for first-party
 * and installed Modules alike, in `cutPhiRuntimeModuleServerAreaContribution`, rather than a rule each
 * Module writes out again.
 */
export function collectPhiSiteModuleServerAreaContributions(input: {
  placements: readonly PhiSiteModulePlacement[];
  contributions: PhiModuleServerContributions;
}): PhiSiteModuleServerAreaContributions {
  const placements = readPhiSiteModulePlacements(input.placements);
  const placed = new Set<PhiRuntimeModuleId>();
  const byArea = new Map<PhiCmsAreaKey, PhiRuntimeModuleServerAreaContribution[]>();
  for (const contribution of input.contributions) {
    const eligibleAreas = requirePhiSiteModulePlacement(placements, contribution.moduleId);
    placed.add(contribution.moduleId);
    const { definition, load } = contribution.catalogEntry;
    const completed = definePhiRuntimeModuleServerAreaContribution({
      moduleId: contribution.moduleId,
      catalogEntry: {
        ...contribution.catalogEntry,
        definition: { ...definition, eligibleAreas },
        load: () => load().then((runtimeModule) => ({ ...runtimeModule, eligibleAreas })),
      },
    });
    for (const area of eligibleAreas) {
      const current = byArea.get(area);
      if (current) {
        current.push(completed);
      } else {
        byArea.set(area, [completed]);
      }
    }
  }
  for (const moduleId of placements.keys()) {
    if (!placed.has(moduleId)) {
      throw new Error(
        `Module "${moduleId}" is placed but its package contributes nothing for it. The package ` +
        "and its package.json#phis disagree about which Modules it carries.",
      );
    }
  }
  return Object.fromEntries(byArea) as PhiSiteModuleServerAreaContributions;
}

export type { PhiSiteModulePlacement };
