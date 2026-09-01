import { describe, expect, it } from "vitest";

import {
  canPhiViewerAccess,
  canPhiViewerAccessOwnedPolicy,
  readPhiViewerAccessPolicy,
  type PhiAccessViewer,
  type PhiViewerAccessPolicy,
} from "./access";

/**
 * Gating a surface on a role a Server Add-on defined.
 *
 * The names travel with the viewer so a navigation entry can be left out for somebody who would be
 * refused anyway. That is presentation, not protection: the request behind the link is decided again on
 * the server, and leaving the link out only spares a person a refusal they could not have acted on.
 *
 * phi-server keeps its own copy of this evaluator, because it does not depend on this package. These
 * are the cases its `authorization-addon-roles.test.ts` asserts too, so a change that reaches only one
 * side fails here -- the same arrangement the doubled signal grammar already uses.
 */

const MARKET = "@acme/market" as const;
const vendorOnly: PhiViewerAccessPolicy = {
  access: "addon-roles",
  providerId: MARKET,
  allowedRoles: ["vendor"],
};

function viewer(roles: string[] | null): PhiAccessViewer {
  return {
    access: "authenticated",
    roleClaims: [],
    groupClaims: [],
    ...(roles === null ? {} : { addonRoleClaims: [{ providerId: MARKET, roles }] }),
  };
}

describe("an addon-roles access policy", () => {
  it("admits somebody holding one of the named roles", () => {
    expect(canPhiViewerAccess(viewer(["vendor"]), vendorOnly)).toBe(true);
    expect(canPhiViewerAccess(viewer(["reviewer", "vendor"]), vendorOnly)).toBe(true);
  });

  it("refuses other roles of the same Add-on", () => {
    expect(canPhiViewerAccess(viewer(["reviewer"]), vendorOnly)).toBe(false);
  });

  it("refuses a viewer that never carried the claims", () => {
    // Absent is not empty-and-known: a surface that never asked must deny rather than assume.
    expect(canPhiViewerAccess(viewer(null), vendorOnly)).toBe(false);
  });

  it("refuses an anonymous viewer whatever the policy names", () => {
    expect(canPhiViewerAccess({ access: "public", roleClaims: [], groupClaims: [] }, vendorOnly))
      .toBe(false);
  });

  it("does not match the same role name from another Add-on", () => {
    expect(canPhiViewerAccess({
      access: "authenticated",
      roleClaims: [],
      groupClaims: [],
      addonRoleClaims: [{ providerId: "@acme/other", roles: ["vendor"] }],
    }, vendorOnly)).toBe(false);
  });

  it("refuses a policy naming no role at all", () => {
    expect(canPhiViewerAccess(viewer(["vendor"]), {
      access: "addon-roles",
      providerId: MARKET,
      allowedRoles: [],
    })).toBe(false);
  });

  it("is owner-checked like the other provider-scoped policies", () => {
    expect(canPhiViewerAccessOwnedPolicy(viewer(["vendor"]), vendorOnly, MARKET)).toBe(true);
    expect(canPhiViewerAccessOwnedPolicy(viewer(["vendor"]), vendorOnly, "@acme/other")).toBe(false);
  });

  it("reads back from a stored descriptor, and refuses a malformed one", () => {
    expect(readPhiViewerAccessPolicy({ ...vendorOnly, allowedRoles: ["vendor", "vendor"] }))
      .toEqual({ access: "addon-roles", providerId: MARKET, allowedRoles: ["vendor"] });
    expect(readPhiViewerAccessPolicy({ ...vendorOnly, allowedRoles: [] })).toBeNull();
    expect(readPhiViewerAccessPolicy({ ...vendorOnly, allowedRoles: ["Vendor"] })).toBeNull();
    expect(readPhiViewerAccessPolicy({ ...vendorOnly, providerId: "market" })).toBeNull();
  });
});
