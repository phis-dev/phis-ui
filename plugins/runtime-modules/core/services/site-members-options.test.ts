import { describe, expect, it } from "vitest";

import {
  PHI_SITE_MEMBERS_PAGE_SIZE,
  readPhiSiteMembersOptions,
  resolvePhiSiteMembersRequestPath,
} from "./site-members-options";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "../client-data-providers";

/**
 * Core's Site member picker: any Module's Form names a person by user id through it, over phis-server's
 * `GET /api/site/members`.
 */
describe("the Site member options provider", () => {
  it("is Core's, so it answers in every Area a Form stands in", () => {
    expect(PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers).toBe("@phis/ui/modules/core/options/site-members");
    expect(PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find((entry) => entry.key === PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers))
      .toMatchObject({ kind: "options", executionMode: "live", ownerModuleId: "@phis/ui/modules/core" });
    expect(PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.some((entry) => entry.key === PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers))
      .toBe(true);
  });

  it("asks for the first page of what is typed, and for the first page of everybody without a search", () => {
    expect(resolvePhiSiteMembersRequestPath(" ada ")).toBe(`/api/site/members?pageSize=${PHI_SITE_MEMBERS_PAGE_SIZE}&q=ada`);
    expect(resolvePhiSiteMembersRequestPath("")).toBe(`/api/site/members?pageSize=${PHI_SITE_MEMBERS_PAGE_SIZE}`);
    expect(resolvePhiSiteMembersRequestPath("a&b")).toBe(`/api/site/members?pageSize=${PHI_SITE_MEMBERS_PAGE_SIZE}&q=a%26b`);
  });

  it("offers each member by user id as text, under the name Core answers", () => {
    expect(readPhiSiteMembersOptions({ items: [{ userId: 12, displayName: "Ada Lovelace" }, { userId: 7, displayName: "#7" }] }))
      .toEqual([{ value: "12", label: "Ada Lovelace" }, { value: "7", label: "#7" }]);
  });

  it("offers nothing for a row that is no member's, or an answer that is not a list of them", () => {
    expect(readPhiSiteMembersOptions({ items: [{ userId: "12", displayName: "Ada" }, { userId: 0, displayName: "x" }, { userId: 3 }, null] }))
      .toEqual([]);
    expect(readPhiSiteMembersOptions(null)).toEqual([]);
    expect(readPhiSiteMembersOptions({ rows: [{ userId: 1, displayName: "Ada" }] })).toEqual([]);
  });
});
