import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "../../constants/cms-areas";
import {
  mergePhiRuntimeModuleServerAreaContributions,
  type PhiRuntimeModuleServerAreaContribution,
} from "./area-contributions";
import {
  PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS,
  type PhiSiteModuleServerAreaContributions,
} from "@phis/ui/module/site-modules";

/**
 * Reading what the Site's own Modules contribute.
 *
 * These live here rather than in `site-modules.ts` because that module is the one a Site build resolves
 * to a generated file; logic placed beside the data would have to be reproduced by whatever generates
 * the replacement.
 *
 * Each reader comes in two forms: a pure one taking the contributions, and one bound to the seam. The
 * pair exists so the composition can be checked against contributions that are not the shipped empty
 * ones -- there is no other way to observe it, because what the seam holds is decided at build time.
 */

export function readPhiSiteModuleServerAreaContributions(
  contributions: PhiSiteModuleServerAreaContributions,
  area: PhiCmsAreaKey,
): readonly PhiRuntimeModuleServerAreaContribution[] {
  return contributions[area] ?? [];
}

/**
 * Every Area's contributions at once, for the Builder.
 *
 * The Builder projection receives the complete installed union, so a Module can be authored inside an
 * isolated target-Area Canvas without being mounted in the Builder Area itself. One Module may
 * contribute to several Areas, so the same id legitimately appears more than once here and the
 * contributions are merged rather than rejected.
 *
 * Within a single Area they are not merged. A Site Module carrying a first-party module id is a
 * collision, and `createPhiRuntimeModuleCatalogFromAreaContributions` refuses it -- a Module quietly
 * losing to a built-in of the same id is the kind of fault that surfaces much later, in the Area that
 * stopped offering it.
 */
export function readAllPhiSiteModuleServerAreaContributions(
  contributions: PhiSiteModuleServerAreaContributions,
): readonly PhiRuntimeModuleServerAreaContribution[] {
  return mergePhiRuntimeModuleServerAreaContributions(
    PHI_CMS_AREA_KEYS.flatMap((area) => [
      ...readPhiSiteModuleServerAreaContributions(contributions, area),
    ]),
  );
}

export function phiSiteModuleServerAreaContributions(area: PhiCmsAreaKey) {
  return readPhiSiteModuleServerAreaContributions(PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS, area);
}

export function phiAllSiteModuleServerAreaContributions() {
  return readAllPhiSiteModuleServerAreaContributions(PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS);
}
