import { describe, expect, it } from "vitest";

import {
  isPhiAssignablePublicRoutePath,
  normalizePhiAreaPublicRoutePaths,
  readPhiAreaPublicRoutePaths,
} from "./cms-area-config";
import {
  buildPhiPublicRouteAddressMap,
  findPhiPublicRoutePathCollisions,
  resolvePhiPublicRoutePath,
  type PhiPublicRouteClaim,
} from "./public-route-claims";
import type { PhiRuntimeModuleId } from "../types";

/**
 * The one question enabling a Module can ask, and the value that answers it.
 *
 * Public is the only Area where two Modules can want one address, so this is the whole of the
 * contested surface: which address a route answers on, who holds it, and what a Site wrote down.
 */

const AUTH = "@phis/ui/modules/auth" as PhiRuntimeModuleId;
const DEV = "@phis/dev/modules/site" as PhiRuntimeModuleId;

const claims: PhiPublicRouteClaim[] = [
  { ownerModuleId: AUTH, presetKey: "auth-login-page", title: "Login", declaredPath: "/login" },
  { ownerModuleId: DEV, presetKey: "dev-login-page", title: "Sign in", declaredPath: "/login" },
  { ownerModuleId: DEV, presetKey: "dev-contracts-page", title: "Contracts", declaredPath: "/contracts" },
];

describe("what a Site may write down about a Public address", () => {
  it("takes an address that is a fixed path", () => {
    expect(isPhiAssignablePublicRoutePath("/dev/login")).toBe(true);
    expect(isPhiAssignablePublicRoutePath("/terms-and-conditions")).toBe(true);
  });

  it("refuses what is not an address a Builder could have meant", () => {
    // The root is the Area's slot, not an address to hand out.
    expect(isPhiAssignablePublicRoutePath("/")).toBe(false);
    // A dynamic segment belongs to the route the Module declared.
    expect(isPhiAssignablePublicRoutePath("/orders/:id")).toBe(false);
    expect(isPhiAssignablePublicRoutePath("login")).toBe(false);
    expect(isPhiAssignablePublicRoutePath("/a//b")).toBe(false);
    expect(isPhiAssignablePublicRoutePath("/../etc")).toBe(false);
  });

  it("reads a stored list and drops what nothing can act on", () => {
    const assignments = readPhiAreaPublicRoutePaths({
      modules: {
        runtimeModules: [AUTH],
        publicRoutePaths: [
          { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/dev/login" },
          { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/second-answer" },
          { ownerModuleId: DEV, presetKey: "broken", path: "not-a-path" },
          "nonsense",
        ],
      },
    });
    expect(assignments).toEqual([
      { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/dev/login" },
    ]);
  });

  it("says so on the way in", () => {
    expect(() => normalizePhiAreaPublicRoutePaths([
      { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/orders/:id" },
    ])).toThrow(/not an address/);
    expect(() => normalizePhiAreaPublicRoutePaths([
      { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/one" },
      { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/two" },
    ])).toThrow(/two addresses/);
  });

  it("sorts by route identity -- Module first, then preset -- so an unchanged list serializes identically", () => {
    expect(normalizePhiAreaPublicRoutePaths([
      { ownerModuleId: DEV, presetKey: "dev-login-page", path: "/dev/login" },
      { ownerModuleId: AUTH, presetKey: "auth-login-page", path: "/sign-in" },
    ]).map((assignment) => assignment.presetKey)).toEqual(["dev-login-page", "auth-login-page"]);
  });
});

describe("which addresses are free", () => {
  it("holds an address for the Module that is switched on", () => {
    const addresses = buildPhiPublicRouteAddressMap({
      claims,
      activeModuleIds: new Set([AUTH]),
      assignments: [],
    });
    expect(addresses.get("/login")).toMatchObject({ kind: "module", assigned: false });
    expect(addresses.has("/contracts")).toBe(false);
  });

  it("reports the address a Module would not get", () => {
    const collisions = findPhiPublicRoutePathCollisions({
      moduleId: DEV,
      claims,
      addresses: buildPhiPublicRouteAddressMap({
        claims,
        activeModuleIds: new Set([AUTH]),
        assignments: [],
      }),
      assignments: [],
    });
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.path).toBe("/login");
    expect(collisions[0]?.claim.presetKey).toBe("dev-login-page");
  });

  it("stops asking once the Site answered", () => {
    const assignments = [{ ownerModuleId: DEV, presetKey: "dev-login-page", path: "/dev/login" }];
    expect(resolvePhiPublicRoutePath(claims[1]!, assignments)).toBe("/dev/login");
    expect(findPhiPublicRoutePathCollisions({
      moduleId: DEV,
      claims,
      addresses: buildPhiPublicRouteAddressMap({
        claims,
        activeModuleIds: new Set([AUTH]),
        assignments,
      }),
      assignments,
    })).toEqual([]);
  });

  it("counts a Site Page as the holder of its address", () => {
    const collisions = findPhiPublicRoutePathCollisions({
      moduleId: DEV,
      claims,
      addresses: buildPhiPublicRouteAddressMap({
        claims,
        activeModuleIds: new Set([]),
        assignments: [],
        sitePages: [{ path: "/contracts", title: "Contracts" }],
      }),
      assignments: [],
    });
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.heldBy).toEqual({ kind: "page", title: "Contracts" });
  });

  it("does not contest the Area root, which is an application rather than a route", () => {
    const rootClaims: PhiPublicRouteClaim[] = [
      { ownerModuleId: AUTH, presetKey: "auth-root", title: "Home", declaredPath: "/" },
      { ownerModuleId: DEV, presetKey: "dev-root", title: "Landing", declaredPath: "/" },
    ];
    expect(findPhiPublicRoutePathCollisions({
      moduleId: DEV,
      claims: rootClaims,
      addresses: buildPhiPublicRouteAddressMap({
        claims: rootClaims,
        activeModuleIds: new Set([AUTH]),
        assignments: [],
      }),
      assignments: [],
    })).toEqual([]);
  });
});
