import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleServerAreaContribution } from "./area-contributions";

/**
 * What the Site's own installed Modules contribute, and nothing else.
 *
 * This file is the seam a Site build replaces. `@phis/ui` ships it empty, so an installation without
 * Modules of its own builds and typechecks exactly as it does today; a Site that has them resolves this
 * specifier to a file of the same shape generated into build state, whose static imports name the
 * installed Module packages.
 *
 * The seam is here rather than in the Skeleton because this is the half that can be updated. The
 * Skeleton belongs to the Site operator, is provided once as scaffolding, and owns no composition: it
 * is not edited when a Module is installed or removed, and only the generated file changes.
 *
 * It holds data and no behaviour on purpose. Whatever replaces this module has to export the same
 * names, and a generator should not have to reproduce a helper to do it -- the readers live in
 * `site-module-contributions.ts`, which is never replaced.
 *
 * See THIRD_PARTY_MODULES.md section 9.
 */
export type PhiSiteModuleServerAreaContributions = Readonly<
  Partial<Record<PhiCmsAreaKey, readonly PhiRuntimeModuleServerAreaContribution[]>>
>;

export const PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS: PhiSiteModuleServerAreaContributions = {};
