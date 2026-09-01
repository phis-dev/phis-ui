/**
 * The site UI's view of the access vocabulary.
 *
 * The vocabulary itself -- claim shapes, policy shapes, and the evaluator -- lives in
 * `@phis/contracts/access`. phi-server decides the same question in its own process, and the site
 * decides it while rendering: per navigation entry, per tree node, in the browser. Neither can defer to
 * the other, so both evaluate, and one compiled source is the only way both can agree. They did not
 * agree before: a claim with negative flags admitted everything on the server and nothing here.
 *
 * What stays in this file is what belongs to this side: the viewer shape the UI actually carries, and
 * the named policies the UI uses.
 */

export {
  PHI_CORE_ROLE_PROVIDER_ID,
  getPhiViewerRoleFlags,
  hasPhiBaseRole,
  hasProviderAddonRole,
  hasProviderGroup,
  hasProviderRole,
  readPhiViewerAccessPolicy,
  type PhiGroupProviderId,
  type PhiRoleProviderId,
  type PhiViewerAccessPolicy,
  type PhiViewerAddonRoleClaim,
  type PhiViewerGroupClaim,
  type PhiViewerRoleClaim,
} from "@phis/contracts/access";

import {
  PHI_CORE_ROLE_PROVIDER_ID,
  PhiBaseRole,
  canPhiAccessSubjectReach,
  isPhiAccessPolicyProviderOwned,
  type PhiAccessSubject,
  type PhiRoleProviderId,
  type PhiViewerAccessPolicy,
  type PhiViewerAddonRoleClaim,
  type PhiViewerGroupClaim,
  type PhiViewerRoleClaim,
} from "@phis/contracts/access";

export const PHI_VIEWER_ACCESS_ANYONE = { access: "anyone" } as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_AUTHENTICATED = {
  access: "authenticated",
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_SITE_ADMIN = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Admin,
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_DEVELOPER_TOOLS = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Developer,
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_STRUCTURE_AUTHORING = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Developer | PhiBaseRole.Builder,
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_CONTENT_EDITING = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Developer | PhiBaseRole.Author | PhiBaseRole.Publisher,
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_PUBLISHING = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Developer | PhiBaseRole.Publisher,
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_SUPPORT = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Developer | PhiBaseRole.Supporter,
} as const satisfies PhiViewerAccessPolicy;
export const PHI_VIEWER_ACCESS_ACCOUNTING = {
  access: "roles",
  providerId: PHI_CORE_ROLE_PROVIDER_ID,
  allowedRoleFlags: PhiBaseRole.Developer | PhiBaseRole.Accountant,
} as const satisfies PhiViewerAccessPolicy;

/**
 * The viewer this side carries.
 *
 * `access` rather than a boolean, because the UI uses the same field for rendering decisions that have
 * nothing to do with authorization. It is projected onto the shared subject at the one place it is
 * evaluated, so neither package has to adopt the other's shape.
 */
export type PhiAccessViewer = {
  access: "public" | "authenticated";
  roleClaims?: readonly PhiViewerRoleClaim[];
  groupClaims?: readonly PhiViewerGroupClaim[];
  /** Absent means none are known here, which denies an `addon-roles` policy rather than granting it. */
  addonRoleClaims?: readonly PhiViewerAddonRoleClaim[];
};

function asSubject(viewer: PhiAccessViewer): PhiAccessSubject {
  return {
    authenticated: viewer.access === "authenticated",
    roleClaims: viewer.roleClaims,
    groupClaims: viewer.groupClaims,
    addonRoleClaims: viewer.addonRoleClaims,
  };
}

export function canPhiViewerAccess(
  viewer: PhiAccessViewer,
  policy: PhiViewerAccessPolicy | null | undefined,
) {
  return canPhiAccessSubjectReach(asSubject(viewer), policy);
}

export function isPhiViewerAccessPolicyProviderOwned(
  policy: PhiViewerAccessPolicy,
  ownerProviderId?: PhiRoleProviderId | null,
) {
  return isPhiAccessPolicyProviderOwned(policy, ownerProviderId);
}

export function canPhiViewerAccessOwnedPolicy(
  viewer: PhiAccessViewer,
  policy: PhiViewerAccessPolicy | null | undefined,
  ownerProviderId?: PhiRoleProviderId | null,
) {
  return (
    (policy == null || isPhiAccessPolicyProviderOwned(policy, ownerProviderId)) &&
    canPhiViewerAccess(viewer, policy)
  );
}

export const PhiViewport = {
  Compact: 1 << 0,
  Medium: 1 << 1,
  Wide: 1 << 2,
} as const;

export const PHI_VIEWPORT_ALL_FLAGS =
  PhiViewport.Compact | PhiViewport.Medium | PhiViewport.Wide;

export type PhiViewportFlags = number;

export function normalizePhiViewportFlags(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 6) {
    return 0;
  }
  return value;
}

export function resolvePhiViewportFlags(value: unknown) {
  return normalizePhiViewportFlags(value) || PHI_VIEWPORT_ALL_FLAGS;
}

export function intersectPhiViewportFlags(
  inheritedFlags: unknown,
  ownFlags: unknown,
) {
  return resolvePhiViewportFlags(inheritedFlags) & resolvePhiViewportFlags(ownFlags);
}

export function intersectPhiInheritedViewportFlags(
  inheritedResolvedFlags: number | null | undefined,
  ownFlags: unknown,
) {
  const inherited = inheritedResolvedFlags == null
    ? PHI_VIEWPORT_ALL_FLAGS
    : inheritedResolvedFlags & PHI_VIEWPORT_ALL_FLAGS;
  return inherited & resolvePhiViewportFlags(ownFlags);
}
