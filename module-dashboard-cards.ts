/**
 * What a Module package needs to put cards on a Dashboard, and nothing else.
 *
 * Narrow for the reason `@phis/ui/module/labels` is: a package outside this one reads it from the Server
 * half every route of the Site imports, and a wider barrel would pull its graph in with it. The
 * first-party Modules import `types/dashboard-cards` and `gateway/site-api-request` by relative path;
 * this is the same reach, for a Module that has only the package's exports.
 *
 * `fetchPhiSiteApi` is here because a card's payload is almost always one question to Core, asked with
 * the credentials the card context carries. Without it a package writes the token, Site key and cookie
 * headers itself, which is a copy of a protocol that is this package's to change. See DASHBOARD.md.
 */

import "server-only";

export {
  createPhiDashboardCardId,
  isPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardForm,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardProvider,
} from "./types/dashboard-cards";
export { fetchPhiSiteApi, type PhiSiteApiRequest } from "./gateway/site-api-request";
