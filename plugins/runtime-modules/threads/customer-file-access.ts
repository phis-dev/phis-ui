import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import type { PhiViewerAccessPolicy } from "../../../types/access";

/**
 * Who works with a customer file: the holders of the Site access `support` or `accounting` (Maintainer,
 * Supporter, Accountant; an Admin through the Site-superuser rule) -- the guard of phis-server
 * `GET /api/site/members/{userId}/file`, said for the Page's entry and its tree.
 */
export const PHI_THREADS_CUSTOMER_FILE_ACCESS = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Maintainer | PhiBaseRole.Supporter | PhiBaseRole.Accountant,
} as const satisfies PhiViewerAccessPolicy;
