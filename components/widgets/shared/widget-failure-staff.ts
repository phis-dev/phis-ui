import { PhiBaseRole } from "@phis/contracts/access";

import { canPhiViewerAccess, PHI_CORE_ROLE_PROVIDER_ID, type PhiAccessViewer, type PhiViewerAccessPolicy } from "../../../types/access";

/*
 * Who reads a Widget's failure on a live page: Staff, who is whoever holds any Core role
 * (`PhiBaseRole.Staff` in @phis/contracts/access). They can have it fixed -- an author, a maintainer,
 * a colleague who tells one -- and a Widget that is simply absent for them was a failure nobody saw
 * (@phis/support's Linked work Table until f5bbd545). A visitor is shown nothing, as before. Admin is
 * Staff by the Site-superuser rule of `canPhiViewerAccess`.
 */
const PHI_WIDGET_FAILURE_READERS = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: Object.values(PhiBaseRole).reduce((mask, flag) => mask | flag, 0),
} as const satisfies PhiViewerAccessPolicy;

/** That `viewer` is Staff and reads a failed Widget's card on a live page (`PhiWidgetFailureAudienceProvider`). */
export function canPhiViewerReadWidgetFailures(viewer: PhiAccessViewer) {
  return canPhiViewerAccess(viewer, PHI_WIDGET_FAILURE_READERS);
}
