import { isPhiRecord } from "../../../helpers/is-record";
import { formatPhiTranslation } from "../../../helpers/translation-format";

/*
 * What User Management knows about Add-on roles, as the Core states it (phis-server AUTHORIZATION.md, "Add-on
 * roles"): the catalog `GET /api/site/addon-roles` answers, the stored assignments a user row carries, the
 * Add-ons the users Table filters by and the roles the edit form offers. Pure, so the Table Provider and the
 * options Providers share one reading.
 */

export type PhiAddonRole = {
  name: string;
  description?: string;
  /** The Site access whose holders hold the role without a grant, as the manifest declares it. */
  impliedBy?: { siteAccess: string };
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

/**
 * A role somebody holds without a stored grant, because they hold the Site access it is `impliedBy` (or one
 * that includes it is): the Core's `implied` / `impliedAddonRoles` entry `{ addonId, role, through: {
 * siteAccess } }`. Shown as held, never sent back by a save -- only the access gives it and takes it away.
 */
export type PhiAddonRoleHeldThroughSiteAccess = PhiAddonRoleAssignment & { siteAccess: string };

const ROLE_NAME = /^[a-z][a-z0-9-]{0,63}$/u;
const SITE_ACCESS_NAME = /^[a-z][a-z-]{0,63}$/u;

/**
 * Where a placement names the words for Add-on roles held through a Site access, in its language: the edit
 * form's `formConfig` and the users Table's `source.params` carry them under this key, written by the users
 * page preset from the Module's Label Set. The options and Table Providers are Client code without a Label
 * Set; the placement has one (the curation Form's "Nobody" reaches its Provider the same way).
 */
export const PHI_USER_MANAGEMENT_ADDON_ROLE_TEXTS_KEY = "addonRoleTexts";

/**
 * The `params.list` value under which the edit form's choices Provider answers the roles held through a Site
 * access instead of the roles to choose.
 */
export const PHI_USER_MANAGEMENT_ADDON_ROLE_IMPLIED_LIST = "implied";

export type PhiAddonRoleTexts = {
  /** A role (or an Add-on's roles, `%1`) and the Site access (`%2`) it is held through: "%1 (via %2)". */
  via: string;
  /** What a role in the catalog that a Site access implies says of it: "Implied by %1". */
  impliedBy: string;
  /** What each Site access is called; one not named here is shown by its key. */
  siteAccess: Readonly<Record<string, string>>;
};

/** The words a placement named under `PHI_USER_MANAGEMENT_ADDON_ROLE_TEXTS_KEY`; the source text where none. */
export function readPhiAddonRoleTexts(value: unknown): PhiAddonRoleTexts {
  const record = isPhiRecord(value) ? value : {};
  const siteAccess = isPhiRecord(record.siteAccess)
    ? Object.fromEntries(Object.entries(record.siteAccess).flatMap(([access, word]) => {
      const text = readString(word);
      return text ? [[access, text]] : [];
    }))
    : {};
  return {
    via: readString(record.via) ?? "%1 (via %2)",
    impliedBy: readString(record.impliedBy) ?? "Implied by %1",
    siteAccess,
  };
}

function nameSiteAccess(texts: PhiAddonRoleTexts, siteAccess: string) {
  return texts.siteAccess[siteAccess] ?? siteAccess;
}

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
      const impliedBy = isPhiRecord(role.impliedBy) ? readString(role.impliedBy.siteAccess) : null;
      return [{
        name,
        ...(description ? { description } : {}),
        ...(impliedBy && SITE_ACCESS_NAME.test(impliedBy) ? { impliedBy: { siteAccess: impliedBy } } : {}),
        grantable: role.grantable === true,
      }];
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

/** The Core's `implied` (an answer of `/api/site/addon-roles`) or a user row's `impliedAddonRoles`. */
export function readPhiAddonRolesHeldThroughSiteAccess(value: unknown): PhiAddonRoleHeldThroughSiteAccess[] {
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    if (!isPhiRecord(entry) || !isPhiRecord(entry.through)) return [];
    const addonId = readString(entry.addonId);
    const role = readString(entry.role);
    const siteAccess = readString(entry.through.siteAccess);
    return addonId && role && siteAccess ? [{ addonId, role, siteAccess }] : [];
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
 * narrow, then one per Add-on and Site access with the roles held through that access ("@acme/books:
 * licence-manager (via Accounting)"), and for a Site Admin the one tag that says every role is held. Stored
 * assignments for a Site Admin are not listed (they apply when the person is no longer one; the dialog shows
 * them). A role both stored and held through an access is in both tags: taking the grant back leaves it held.
 */
export function buildPhiAddonRoleTags(row: Record<string, unknown>, texts: PhiAddonRoleTexts = readPhiAddonRoleTexts(null)): string[] {
  if (isPhiAddonRoleHolderOfAll(row)) return [PHI_USER_MANAGEMENT_ADDON_ALL_ROLES_TAG];
  const byAddon = new Map<string, string[]>();
  for (const { addonId, role } of readPhiAddonRoleAssignments(row.addonRoles)) {
    byAddon.set(addonId, [...(byAddon.get(addonId) ?? []), role]);
  }
  const byAccess = new Map<string, { addonId: string; siteAccess: string; roles: string[] }>();
  for (const { addonId, role, siteAccess } of readPhiAddonRolesHeldThroughSiteAccess(row.impliedAddonRoles)) {
    const key = `${addonId}\u0000${siteAccess}`;
    const entry = byAccess.get(key) ?? { addonId, siteAccess, roles: [] };
    entry.roles.push(role);
    byAccess.set(key, entry);
  }
  return [
    ...[...byAddon].map(([addonId, roles]) => `${addonId}: ${roles.join(", ")}`),
    ...[...byAccess.values()].map(({ addonId, siteAccess, roles }) =>
      formatPhiTranslation(texts.via, [`${addonId}: ${roles.join(", ")}`, nameSiteAccess(texts, siteAccess)])),
  ];
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
export function formatPhiAddonRoleValue(addonId: string, role: string) {
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
 *
 * A role a Site access implies says so in its description ("Implied by Accounting"): choosing it stores a
 * grant beside the access, which keeps the role once the access is gone.
 */
export function buildPhiAddonRoleChoiceOptions(
  catalog: readonly PhiAddonRoleCatalogEntry[],
  held: readonly PhiAddonRoleAssignment[] | null,
  texts: PhiAddonRoleTexts = readPhiAddonRoleTexts(null),
) {
  const heldValues = held ? new Set(held.map(({ addonId, role }) => formatPhiAddonRoleValue(addonId, role))) : null;
  return catalog.flatMap((entry) => entry.roles.flatMap((role) => {
    const value = formatPhiAddonRoleValue(entry.addonId, role.name);
    if (!role.grantable && heldValues && !heldValues.has(value)) return [];
    const description = [
      role.description,
      role.impliedBy ? formatPhiTranslation(texts.impliedBy, [nameSiteAccess(texts, role.impliedBy.siteAccess)]) : undefined,
    ].filter(Boolean).join(" · ");
    return [{
      value,
      label: role.name,
      ...(description ? { description } : {}),
      group: entry.title,
      ...(role.grantable ? {} : { disabled: true }),
    }];
  }));
}

/**
 * The options of the edit form's read-only list of roles held through a Site access: one per role, labelled
 * with the access ("licence-manager (via Accounting)") so the tag says why it is there, under its Add-on's
 * name, and disabled -- nobody removes a role an access gives. Valued as the save names roles; the save
 * carries the list under its own key, which the Core does not read, so the stored grants stay the other
 * field's alone.
 */
export function buildPhiAddonRoleImpliedOptions(
  catalog: readonly PhiAddonRoleCatalogEntry[],
  implied: readonly PhiAddonRoleHeldThroughSiteAccess[],
  texts: PhiAddonRoleTexts = readPhiAddonRoleTexts(null),
) {
  const titles = new Map(catalog.map((entry) => [entry.addonId, entry.title] as const));
  return implied.map(({ addonId, role, siteAccess }) => ({
    value: formatPhiAddonRoleValue(addonId, role),
    label: formatPhiTranslation(texts.via, [role, nameSiteAccess(texts, siteAccess)]),
    group: titles.get(addonId) ?? addonId,
    disabled: true,
  }));
}
