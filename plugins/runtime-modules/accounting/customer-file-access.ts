import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import type { PhiViewerAccessPolicy } from "../../../types/access";

/**
 * Who works with the customer file: the holders of the Site access `accounting` (Maintainer, Accountant;
 * an Admin through the Site-superuser rule). phis-server's `GET /api/site/members/{userId}/file` answers
 * `support` as well, without addresses; a Supporter's file is the Support Module's own Page over the same
 * route, not this one. Said for the Page's entry and its tree.
 */
export const PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Maintainer | PhiBaseRole.Accountant,
} as const satisfies PhiViewerAccessPolicy;
