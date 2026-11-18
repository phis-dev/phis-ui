import { describe, expect, it } from "vitest";

import { buildPhiUserManagementUsersQueryParams } from "./users-query";

describe("the users route's query", () => {
  it("sends the Add-on filter as the Core's addonId alone", () => {
    const params = buildPhiUserManagementUsersQueryParams({
      page: 2,
      pageSize: 50,
      search: " ada ",
      filters: { accountType: "roles", addonRole: " @acme/market ", enabled: "enabled" },
      sorts: [{ key: "name", direction: "descending" }],
    });
    expect(Object.fromEntries(params)).toEqual({
      page: "2",
      pageSize: "50",
      search: "ada",
      accountType: "roles",
      addonId: "@acme/market",
      enabled: "enabled",
      sortKey: "name",
      sortOrder: "descend",
    });
    expect(params.has("addonRole")).toBe(false);
  });

  it("asks for no Add-on without a filter value", () => {
    expect(Object.fromEntries(buildPhiUserManagementUsersQueryParams({ filters: { addonRole: "  " } }))).toEqual({
      page: "1",
      pageSize: "20",
    });
  });
});
