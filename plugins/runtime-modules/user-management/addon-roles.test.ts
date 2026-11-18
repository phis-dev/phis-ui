import { describe, expect, it } from "vitest";

import {
  PHI_USER_MANAGEMENT_ADDON_ALL_ROLES_TAG,
  buildPhiAddonFilterOptions,
  buildPhiAddonRoleChoiceOptions,
  buildPhiAddonRoleTags,
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
    {
      addonId: "@acme/shop",
      title: "Shop",
      roles: [{ name: "clerk", grantableBy: { role: "manager" }, grantable: "yes" }],
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
      ["@acme/shop", "Shop", ["clerk"]],
    ]);
  });

  it("reads each role's description and whether the actor may grant it, which only `true` says", () => {
    expect(catalog.flatMap((entry) => entry.roles)).toEqual([
      { name: "market-admin", grantable: true },
      { name: "vendor", description: "Sells things.", grantable: false },
      { name: "clerk", grantable: false },
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
  it("offers each Add-on and never a single role", () => {
    expect(buildPhiAddonFilterOptions(catalog)).toEqual([
      { value: "@acme/market", label: "@acme/market" },
      { value: "@acme/shop", label: "Shop", description: "@acme/shop" },
    ]);
  });
});

describe("the Add-on roles the edit form offers", () => {
  const grantAll = readPhiAddonRoleCatalog({
    addons: [
      {
        addonId: "@acme/market",
        title: "Market",
        roles: [
          { name: "market-admin", grantable: true },
          { name: "vendor", description: "Sells things.", grantable: true },
        ],
      },
      { addonId: "@acme/shop", title: "@acme/shop", roles: [{ name: "clerk", grantable: true }] },
    ],
  });

  it("lists every role under its Add-on's name, valued as the save takes it", () => {
    expect(buildPhiAddonRoleChoiceOptions(grantAll, [])).toEqual([
      { value: "@acme/market:market-admin", label: "market-admin", group: "Market" },
      { value: "@acme/market:vendor", label: "vendor", description: "Sells things.", group: "Market" },
      { value: "@acme/shop:clerk", label: "clerk", group: "@acme/shop" },
    ]);
  });

  it("leaves out a role the actor may not grant and the person does not hold", () => {
    expect(buildPhiAddonRoleChoiceOptions(catalog, []).map((option) => option.value)).toEqual([
      "@acme/market:market-admin",
    ]);
  });

  it("keeps a held role the actor may not grant, disabled, so the save sends it unchanged", () => {
    expect(buildPhiAddonRoleChoiceOptions(catalog, [
      { addonId: "@acme/market", role: "vendor" },
      { addonId: "@acme/other", role: "vendor" },
    ])).toEqual([
      { value: "@acme/market:market-admin", label: "market-admin", group: "@acme/market" },
      { value: "@acme/market:vendor", label: "vendor", description: "Sells things.", group: "@acme/market", disabled: true },
    ]);
  });

  it("lists every role the actor may not grant disabled where what the person holds is not known", () => {
    expect(buildPhiAddonRoleChoiceOptions(catalog, null).map((option) => [option.value, option.disabled === true]))
      .toEqual([
        ["@acme/market:market-admin", false],
        ["@acme/market:vendor", true],
        ["@acme/shop:clerk", true],
      ]);
  });
});
