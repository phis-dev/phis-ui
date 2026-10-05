import { PHI_SHARED_PACKAGE_NAME } from "../types/signals";

/**
 * The Public login Page, by identity.
 *
 * Named here as data, the way the Foundation names everything a Module owns (`runtime-render-client-types`):
 * the Area access guard has to find the Page in the active route table, and the Foundation may not import
 * the Auth Module to ask it. The Module reads its key from here (`auth/ids.ts`), so the two cannot drift.
 */
export const PHI_PUBLIC_LOGIN_ROUTE_IDENTITY = {
  ownerModuleId: `${PHI_SHARED_PACKAGE_NAME}/modules/auth`,
  presetKey: "public-login-page",
} as const;
