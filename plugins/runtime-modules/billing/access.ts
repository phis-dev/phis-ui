import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import type { PhiViewerAccessPolicy } from "../../../types/access";

/**
 * Who works with the Site's billing documents and number series: the Site roles Admin and Accountant --
 * Admin through the Site-superuser rule -- and not the broader Site access `accounting`, which also
 * admits a Maintainer (phis-server AUTHORIZATION.md, `billing`; owner, 2026-11-27). Said for the entries
 * and the trees of the two Accounting Pages, as Core's routes say it.
 */
export const PHI_BILLING_STAFF_ACCESS = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Accountant,
} as const satisfies PhiViewerAccessPolicy;
