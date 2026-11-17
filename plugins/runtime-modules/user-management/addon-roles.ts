import { isPhiRecord } from "../../../helpers/is-record";

/*
 * What User Management knows about Add-on roles, as the Core states it (phis-server AUTHORIZATION.md, "Add-on
 * roles"): the catalog `GET /api/site/addon-roles` answers, the stored assignments a user row carries, and the
 * filter value the users Table sends. Pure, so the Table Provider and the options Provider share one reading.
 */

export type PhiAddonRole = { name: string };

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
      return [{ name }];
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

/** The filter's options: each Add-on (any role), then each of its roles. Values are `<addonId>` and `<addonId>:<role>`. */
export function buildPhiAddonRoleFilterOptions(catalog: readonly PhiAddonRoleCatalogEntry[]) {
  return catalog.flatMap((entry) => [
    { value: entry.addonId, label: entry.title },
    ...entry.roles.map((role) => ({ value: `${entry.addonId}:${role.name}`, label: `${entry.title}: ${role.name}` })),
  ]);
}

/** The Core's `addonId` and optional `addonRole` filters from the one value the Table filter holds. */
export function parsePhiAddonRoleFilter(value: string): { addonId: string; addonRole: string | null } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cut = trimmed.lastIndexOf(":");
  const role = cut > 0 ? trimmed.slice(cut + 1) : null;
  if (role !== null && ROLE_NAME.test(role)) return { addonId: trimmed.slice(0, cut), addonRole: role };
  return { addonId: trimmed, addonRole: null };
}
