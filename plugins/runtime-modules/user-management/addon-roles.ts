import { isPhiRecord } from "../../../helpers/is-record";

/*
 * What User Management knows about Add-on roles, as the Core states it (phis-server AUTHORIZATION.md, "Add-on
 * roles"): the catalog `GET /api/site/addon-roles` answers, the stored assignments a user row carries, the
 * Add-ons the users Table filters by and the roles the edit form offers. Pure, so the Table Provider and the
 * options Providers share one reading.
 */

export type PhiAddonRole = {
  name: string;
  description?: string;
  /** Whether the acting person may hand this role out, as the Core decided it for this request. */
  grantable: boolean;
};

export type PhiAddonRoleCatalogEntry = {
  addonId: string;
  /** The Add-on's `title`: its id until its manifest carries a display name; shown as stated. */
  title: string;
  roles: readonly PhiAddonRole[];
};

export type PhiAddonRoleAssignment = { addonId: string; role: string };

const ROLE_NAME = /^[a-z][a-z0-9-]{0,63}$/u;

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** The catalog of an `GET /api/site/addon-roles` answer; entries and roles that do not read are left out. */
export function readPhiAddonRoleCatalog(payload: unknown): PhiAddonRoleCatalogEntry[] {
  const addons = isPhiRecord(payload) && Array.isArray(payload.addons) ? payload.addons : [];
  return addons.flatMap((addon) => {
    if (!isPhiRecord(addon)) return [];
    const addonId = readString(addon.addonId);
    if (!addonId) return [];
    const roles = (Array.isArray(addon.roles) ? addon.roles : []).flatMap((role): PhiAddonRole[] => {
      if (!isPhiRecord(role)) return [];
      const name = readString(role.name);
      if (!name || !ROLE_NAME.test(name)) return [];
      const description = readString(role.description);
      return [{ name, ...(description ? { description } : {}), grantable: role.grantable === true }];
    });
    return roles.length > 0 ? [{ addonId, title: readString(addon.title) ?? addonId, roles }] : [];
  });
}

/** The stored assignments in a user row's `addonRoles` or an answer's `held`. */
export function readPhiAddonRoleAssignments(value: unknown): PhiAddonRoleAssignment[] {
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    if (!isPhiRecord(entry)) return [];
    const addonId = readString(entry.addonId);
    const role = readString(entry.role);
    return addonId && role ? [{ addonId, role }] : [];
  });
}

/** The tag a Site Admin's row carries in place of single roles; the Table maps it to its label. */
export const PHI_USER_MANAGEMENT_ADDON_ALL_ROLES_TAG = "all";

/**
 * Whether a list row is a Site Admin, who holds every declared role of every enabled Add-on without a stored
 * assignment: an enabled account whose `roleTags` hold `admin` (the Core states no flag of its own).
 */
function isPhiAddonRoleHolderOfAll(row: Record<string, unknown>) {
  return row.enabled === true && Array.isArray(row.roleTags) && row.roleTags.includes("admin");
}

/**
 * The tags of a row's Add-on roles column: one tag per Add-on with its stored roles, so the column stays
 * narrow, and for a Site Admin the one tag that says every role is held. Stored assignments for a Site Admin
 * are not listed (they apply when the person is no longer one; the dialog shows them).
 */
export function buildPhiAddonRoleTags(row: Record<string, unknown>): string[] {
  if (isPhiAddonRoleHolderOfAll(row)) return [PHI_USER_MANAGEMENT_ADDON_ALL_ROLES_TAG];
  const byAddon = new Map<string, string[]>();
  for (const { addonId, role } of readPhiAddonRoleAssignments(row.addonRoles)) {
    byAddon.set(addonId, [...(byAddon.get(addonId) ?? []), role]);
  }
  return [...byAddon].map(([addonId, roles]) => `${addonId}: ${roles.join(", ")}`);
}

/**
 * The users Table filter's options: one per Add-on, never a single role -- choosing one finds whoever holds
 * any of its roles (the Core's `addonId` filter). The label is the Add-on's title; the id is the description,
 * left out while the title is the id itself, so the list does not say everything twice.
 */
export function buildPhiAddonFilterOptions(catalog: readonly PhiAddonRoleCatalogEntry[]) {
  return catalog.map((entry) => ({
    value: entry.addonId,
    label: entry.title,
    ...(entry.title === entry.addonId ? {} : { description: entry.addonId }),
  }));
}

/** One role as the user save names it: `"<addonId>:<role>"`, which the Core splits at the last colon. */
function formatPhiAddonRoleValue(addonId: string, role: string) {
  return `${addonId}:${role}`;
}

/**
 * The edit form's Add-on role choices, under one heading per Add-on: every role the acting person may grant,
 * and the ones the person edited holds that the actor may not grant, disabled.
 *
 * The save takes the whole list of roles the person is to hold afterwards and checks every difference to
 * what is stored against the actor. A held role missing from the choices would be a value with no option,
 * which the control lets anyone remove -- and the save would then ask to take back a role the actor has no
 * standing over. As a disabled option it stays in the value as a tag nobody can remove, and the save sends it
 * unchanged. `held` is null where the Core did not say what the person holds; every role the actor may not
 * grant is listed disabled then, so whichever of them the person holds is kept the same way.
 */
export function buildPhiAddonRoleChoiceOptions(
  catalog: readonly PhiAddonRoleCatalogEntry[],
  held: readonly PhiAddonRoleAssignment[] | null,
) {
  const heldValues = held ? new Set(held.map(({ addonId, role }) => formatPhiAddonRoleValue(addonId, role))) : null;
  return catalog.flatMap((entry) => entry.roles.flatMap((role) => {
    const value = formatPhiAddonRoleValue(entry.addonId, role.name);
    if (!role.grantable && heldValues && !heldValues.has(value)) return [];
    return [{
      value,
      label: role.name,
      ...(role.description ? { description: role.description } : {}),
      group: entry.title,
      ...(role.grantable ? {} : { disabled: true }),
    }];
  }));
}
