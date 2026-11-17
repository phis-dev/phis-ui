"use client";

import { createPhiControlOptionsProviderClient } from "../../../../components/controls/phi-options-provider";
import { buildPhiAddonRoleFilterOptions, readPhiAddonRoleCatalog } from "../addon-roles";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

/**
 * The Add-ons enabled for the Site and their roles, as one filter's options: an Add-on (any role) and each
 * role of it. The Core answers every signed-in caller (`GET /api/site/addon-roles`); who may see the users
 * list at all is settled by the users route itself.
 */
export const PhiUserManagementAddonRoleOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleOptions,
  load: async () => {
    const response = await fetch("/api/site/addon-roles", {
      cache: "no-store",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error("Failed to load the Add-on roles.");
    return payload;
  },
  resolveLoadKey: () => "user-management-addon-roles",
  resolve: (context) => ({ options: buildPhiAddonRoleFilterOptions(readPhiAddonRoleCatalog(context.asyncData)) }),
});
