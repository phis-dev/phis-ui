import { describe, expect, it } from "vitest";

import {
  PHI_USER_MANAGEMENT_ADDON_ALL_ROLES_TAG,
  buildPhiAddonRoleFilterOptions,
  buildPhiAddonRoleTags,
  parsePhiAddonRoleFilter,
  readPhiAddonRoleAssignments,
  readPhiAddonRoleCatalog,
} from "./addon-roles";

const catalog = readPhiAddonRoleCatalog({
  addons: [
    {
      addonId: "@acme/market",
      title: "@acme/market",
      roles: [
        { name: "market-admin", grantableBy: { siteAccess: "site-admin" }, includes: ["vendor"], grantable: true },
        { name: "vendor", description: "Sells things.", grantableBy: { role: "market-admin" }, grantable: false },
        { name: "Bad Name", grantable: true },
      ],
    },
    { addonId: "@acme/empty", title: "Empty", roles: [] },
    { title: "no id", roles: [{ name: "x" }] },
    "not a record",
  ],
});

describe("the Add-on role catalog", () => {
  it("keeps Add-ons with declared roles, with the title as stated, and drops what does not read", () => {
    expect(catalog.map((entry) => [entry.addonId, entry.title, entry.roles.map((role) => role.name)])).toEqual([
      ["@acme/market", "@acme/market", ["market-admin", "vendor"]],
    ]);
  });

  it("reads an answer that is no catalog as empty", () => {
    expect(readPhiAddonRoleCatalog(null)).toEqual([]);
    expect(readPhiAddonRoleCatalog({ addons: "x" })).toEqual([]);
  });
});

describe("the Add-on role tags of a user row", () => {
  it("names one tag per Add-on with the roles stored for it", () => {
    expect(buildPhiAddonRoleTags({
      enabled: true,
      roleTags: ["editor"],
      addonRoles: [
        { addonId: "@acme/market", role: "vendor" },
        { addonId: "@acme/shop", role: "clerk" },
        { addonId: "@acme/market", role: "market-admin" },
      ],
    })).toEqual(["@acme/market: vendor, market-admin", "@acme/shop: clerk"]);
  });

  it("says every role is held for an enabled Site Admin, whatever is stored", () => {
    expect(buildPhiAddonRoleTags({
      enabled: true,
      roleTags: ["admin", "editor"],
      addonRoles: [{ addonId: "@acme/market", role: "vendor" }],
    })).toEqual([PHI_USER_MANAGEMENT_ADDON_ALL_ROLES_TAG]);
  });

  it("lists the stored roles of a disabled admin, who holds nothing", () => {
    expect(buildPhiAddonRoleTags({
      enabled: false,
      roleTags: ["admin"],
      addonRoles: [{ addonId: "@acme/market", role: "vendor" }],
    })).toEqual(["@acme/market: vendor"]);
  });

  it("is empty without assignments", () => {
    expect(buildPhiAddonRoleTags({ enabled: true, roleTags: [] })).toEqual([]);
    expect(readPhiAddonRoleAssignments([{ addonId: "a" }, { role: "b" }, null])).toEqual([]);
  });
});

describe("the Add-on role filter", () => {
  it("offers each Add-on and each of its roles", () => {
    expect(buildPhiAddonRoleFilterOptions(catalog)).toEqual([
      { value: "@acme/market", label: "@acme/market" },
      { value: "@acme/market:market-admin", label: "@acme/market: market-admin" },
      { value: "@acme/market:vendor", label: "@acme/market: vendor" },
    ]);
  });

  it("sends the Core's addonId, and addonRole only for a role", () => {
    expect(parsePhiAddonRoleFilter("@acme/market")).toEqual({ addonId: "@acme/market", addonRole: null });
    expect(parsePhiAddonRoleFilter("@acme/market:vendor")).toEqual({ addonId: "@acme/market", addonRole: "vendor" });
    expect(parsePhiAddonRoleFilter("  ")).toBeNull();
  });
});
