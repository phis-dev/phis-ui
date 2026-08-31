import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleServerAreaContribution } from "./area-contributions";

/**
 * What the Site's own installed Modules contribute, and nothing else.
 *
 * This is the shape of the file `phis-cli` generates into a Site's build state, and the value the Area
 * hosts take as an argument.
 *
 * It is passed in rather than imported from here, because a Site build cannot redirect an import that
 * happens inside `@phis/ui`: a bundler alias matches the request string, and a package's own internal
 * request is not one a Site can name. Measured rather than assumed -- an alias on this module leaves the
 * empty value in the bundle.
 *
 * The Skeleton passes it through once and owns no composition. It is not edited when a Module is
 * installed or removed; only the generated file changes.
 *
 * See THIRD_PARTY_MODULES.md section 9.
 */
export type PhiSiteModuleServerAreaContributions = Readonly<
  Partial<Record<PhiCmsAreaKey, readonly PhiRuntimeModuleServerAreaContribution[]>>
>;

/** A Site that installed no Modules of its own. */
export const PHI_NO_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS: PhiSiteModuleServerAreaContributions = {};
