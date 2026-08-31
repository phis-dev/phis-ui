import type { PhiCmsAreaKey } from "./constants/cms-areas";
import type { PhiRuntimeModuleServerAreaContribution } from "./plugins/runtime-modules/area-contributions";
import type { PhiSiteModuleServerAreaContributions } from "./plugins/runtime-modules/site-modules";

/**
 * Turning what Module packages export into the per-Area projection a Site build resolves.
 *
 * This runs where the projection is imported, not where it is written. `phis-cli` generates a file that
 * imports the installed packages and calls this; it never loads a Module itself, which it could not do
 * anyway -- a Module's boundaries include TSX and Client code that has no business running inside a
 * command-line tool. The generated file therefore stays a list of imports and one call.
 *
 * Placement follows `eligibleAreas` on each Module's own definition. A Module that names no Area reaches
 * no catalog; that is refused when the package is built, in `definePhiModuleDefinitions`.
 */
export function collectPhiSiteModuleServerAreaContributions(
  contributions: readonly PhiRuntimeModuleServerAreaContribution[],
): PhiSiteModuleServerAreaContributions {
  const byArea = new Map<PhiCmsAreaKey, PhiRuntimeModuleServerAreaContribution[]>();
  for (const contribution of contributions) {
    for (const area of contribution.catalogEntry.definition.eligibleAreas) {
      const current = byArea.get(area);
      if (current) {
        current.push(contribution);
      } else {
        byArea.set(area, [contribution]);
      }
    }
  }
  return Object.fromEntries(byArea) as PhiSiteModuleServerAreaContributions;
}
