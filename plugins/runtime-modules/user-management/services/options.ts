"use client";

import {
  createPhiControlOptionsProviderClient,
  readPhiControlOptionsProviderParam,
} from "../../../../components/controls/phi-options-provider";
import { isPhiRecord } from "../../../../helpers/is-record";
import {
  PHI_USER_MANAGEMENT_ADDON_ROLE_IMPLIED_LIST,
  PHI_USER_MANAGEMENT_ADDON_ROLE_TEXTS_KEY,
  buildPhiAddonFilterOptions,
  buildPhiAddonRoleChoiceOptions,
  buildPhiAddonRoleImpliedOptions,
  readPhiAddonRoleAssignments,
  readPhiAddonRoleCatalog,
  readPhiAddonRoleTexts,
  readPhiAddonRolesHeldThroughSiteAccess,
} from "../addon-roles";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

const ADDON_ROLES_PATH = "/api/site/addon-roles";

async function fetchAddonRoles(query: string) {
  return await fetch(`${ADDON_ROLES_PATH}${query}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });
}

async function readAddonRolesAnswer(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Failed to load the Add-on roles.");
  return payload;
}

/**
 * The Add-ons enabled for the Site that declare roles, as the users Table filter's options: one per Add-on,
 * matching whoever holds any of its roles. The Core answers every signed-in caller
 * (`GET /api/site/addon-roles`); who may see the users list at all is settled by the users route itself.
 */
export const PhiUserManagementAddonRoleOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleOptions,
  load: async () => await readAddonRolesAnswer(await fetchAddonRoles("")),
  resolveLoadKey: () => "user-management-addon-roles",
  resolve: (context) => ({ options: buildPhiAddonFilterOptions(readPhiAddonRoleCatalog(context.asyncData)) }),
});

function readUserId(value: unknown) {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  return /^[1-9][0-9]*$/u.test(text) ? text : null;
}

/**
 * The Add-on roles the edit form offers one user (`buildPhiAddonRoleChoiceOptions`): the catalog with what
 * the person holds, from `GET /api/site/addon-roles?userId=`, asked once per user the form is opened on.
 *
 * The Core refuses that question to an actor who may grant no role at all; such an actor is offered nothing,
 * and the plain catalog lists every role disabled, which keeps whatever the person holds. So does an answer
 * without a user to ask about.
 *
 * With `params.list` `implied` the same answer gives the read-only list beside it: the roles the person holds
 * through a Site access (`implied`, `buildPhiAddonRoleImpliedOptions`), one load for both fields. The words
 * for the access come from the placement (`PHI_USER_MANAGEMENT_ADDON_ROLE_TEXTS_KEY` in the form's config).
 */
export const PhiUserManagementAddonRoleChoiceOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.addonRoleChoiceOptions,
  load: async ({ dependencies }) => {
    const userId = readUserId(dependencies.userId);
    if (userId) {
      const response = await fetchAddonRoles(`?${new URLSearchParams({ userId }).toString()}`);
      if (response.status !== 403) return await readAddonRolesAnswer(response);
    }
    return await readAddonRolesAnswer(await fetchAddonRoles(""));
  },
  resolveLoadKey: () => "user-management-addon-role-choices",
  resolve: (context) => {
    const catalog = readPhiAddonRoleCatalog(context.asyncData);
    const texts = readPhiAddonRoleTexts(context.sourceConfig?.[PHI_USER_MANAGEMENT_ADDON_ROLE_TEXTS_KEY]);
    const answer = isPhiRecord(context.asyncData) ? context.asyncData : null;
    if (readPhiControlOptionsProviderParam(context.optionsProvider, "list") === PHI_USER_MANAGEMENT_ADDON_ROLE_IMPLIED_LIST) {
      return { options: buildPhiAddonRoleImpliedOptions(catalog, readPhiAddonRolesHeldThroughSiteAccess(answer?.implied), texts) };
    }
    const held = answer && Array.isArray(answer.held) ? readPhiAddonRoleAssignments(answer.held) : null;
    return { options: buildPhiAddonRoleChoiceOptions(catalog, held, texts) };
  },
});
