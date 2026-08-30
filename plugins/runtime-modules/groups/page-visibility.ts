import type { PhiViewerGroupClaim } from "../../../types/access";
import { PhiGroupMembershipFlags } from "../../../constants/site-groups";

/**
 * Whether this viewer administers any group at all.
 *
 * Answered while the Page is built rather than by a condition on each control, because it is one answer
 * for the whole table: someone who manages nothing would only ever see controls they cannot touch, and
 * a control that can only be refused is worse than no control. A Manager of any group -- and Developer
 * and Admin, who administer every group -- gets them. Which of the listed rows they may actually act on
 * is a second, per-row question the control plane answers with `manages`.
 */
export function canPhiViewerManageSomeGroup(input: {
  siteWide: boolean;
  groupClaims: readonly PhiViewerGroupClaim[];
}) {
  if (input.siteWide) return true;
  return input.groupClaims.some((claim) =>
    (claim.flags & PhiGroupMembershipFlags.Manager) === PhiGroupMembershipFlags.Manager);
}
