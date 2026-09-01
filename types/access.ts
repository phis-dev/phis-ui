import { PhiBaseRole } from "../constants/phi-base-roles";

export const PHI_CORE_ROLE_PROVIDER_ID = "@phis/phi-server/core" as const;

export type PhiRoleProviderId = `@${string}/${string}`;

export type PhiViewerRoleClaim = {
  providerId: PhiRoleProviderId;
  flags: number;
};

export type PhiGroupProviderId = `@${string}/${string}`;

export type PhiViewerGroupClaim = {
  providerId: PhiGroupProviderId;
  key: string;
  flags: number;
};

/**
 * The roles a Server Add-on declared, held by this viewer, by name.
 *
 * Names rather than flags, unlike `PhiViewerRoleClaim`. An Add-on's roles are frozen from the first
 * assignment and are declared in its own manifest, so a bit position would have to be handed out and
 * kept forever -- reordering the manifest would silently change what a policy means, and thirty-two
 * would be the ceiling. Core never interprets these; it carries them so a policy can name one.
 */
export type PhiViewerAddonRoleClaim = {
  providerId: PhiRoleProviderId;
  roles: readonly string[];
};

export type PhiViewerAccessPolicy =
  | { access: "anyone" }
  | { access: "anonymous" }
  | { access: "authenticated" }
  | {
      access: "roles";
      providerId: PhiRoleProviderId;
      allowedRoleFlags: number;
    }
  | {
      access: "groups";
      providerId: PhiGroupProviderId;
      allowedGroupKeys: readonly string[];
    }
  | {
      access: "addon-roles";
      providerId: PhiRoleProviderId;
      allowedRoles: readonly string[];
    };

const PHI_ROLE_PROVIDER_ID_PATTERN = /^@[^/]+\/[^/]+(?:\/[^/]+)*$/;
/** The same shape a manifest may declare a role under. */
const PHI_ADDON_ROLE_NAME_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

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

export type PhiAccessViewer = {
  access: "public" | "authenticated";
  roleClaims?: readonly PhiViewerRoleClaim[];
  groupClaims?: readonly PhiViewerGroupClaim[];
  /**
   * Absent means none are known here, not that the viewer holds none: a surface that never asked for
   * them evaluates an `addon-roles` policy to false, which is the safe direction.
   */
  addonRoleClaims?: readonly PhiViewerAddonRoleClaim[];
};

export function readPhiViewerAccessPolicy(
  value: unknown,
): PhiViewerAccessPolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.access === "anyone" ||
    record.access === "anonymous" ||
    record.access === "authenticated"
  ) {
    return { access: record.access };
  }
  if (
    record.access === "roles" &&
    typeof record.providerId === "string" &&
    PHI_ROLE_PROVIDER_ID_PATTERN.test(record.providerId) &&
    typeof record.allowedRoleFlags === "number" &&
    Number.isInteger(record.allowedRoleFlags) &&
    record.allowedRoleFlags > 0
  ) {
    return {
      access: "roles",
      providerId: record.providerId as PhiRoleProviderId,
      allowedRoleFlags: record.allowedRoleFlags,
    };
  }
  if (
    record.access === "groups" &&
    typeof record.providerId === "string" &&
    PHI_ROLE_PROVIDER_ID_PATTERN.test(record.providerId) &&
    Array.isArray(record.allowedGroupKeys) &&
    record.allowedGroupKeys.length > 0 &&
    record.allowedGroupKeys.every((key) =>
      typeof key === "string" && /^[a-z0-9][a-z0-9._-]{0,159}$/u.test(key),
    )
  ) {
    return {
      access: "groups",
      providerId: record.providerId as PhiGroupProviderId,
      allowedGroupKeys: [...new Set(record.allowedGroupKeys as string[])],
    };
  }
  if (
    record.access === "addon-roles" &&
    typeof record.providerId === "string" &&
    PHI_ROLE_PROVIDER_ID_PATTERN.test(record.providerId) &&
    Array.isArray(record.allowedRoles) &&
    record.allowedRoles.length > 0 &&
    record.allowedRoles.every((role) =>
      typeof role === "string" && PHI_ADDON_ROLE_NAME_PATTERN.test(role),
    )
  ) {
    return {
      access: "addon-roles",
      providerId: record.providerId as PhiRoleProviderId,
      allowedRoles: [...new Set(record.allowedRoles as string[])],
    };
  }
  return null;
}

export function isPhiViewerAccessPolicyProviderOwned(
  policy: PhiViewerAccessPolicy,
  ownerProviderId?: PhiRoleProviderId | null,
) {
  return (
    policy.access !== "roles" &&
    policy.access !== "groups" &&
    policy.access !== "addon-roles"
  ) ||
    policy.providerId === PHI_CORE_ROLE_PROVIDER_ID ||
    (ownerProviderId != null && policy.providerId === ownerProviderId);
}

export function canPhiViewerAccessOwnedPolicy(
  viewer: PhiAccessViewer,
  policy: PhiViewerAccessPolicy | null | undefined,
  ownerProviderId?: PhiRoleProviderId | null,
) {
  return (
    (policy == null || isPhiViewerAccessPolicyProviderOwned(policy, ownerProviderId)) &&
    canPhiViewerAccess(viewer, policy)
  );
}

function normalizeRoleFlags(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function getPhiViewerRoleFlags(
  viewer: Pick<PhiAccessViewer, "roleClaims">,
  providerId: PhiRoleProviderId,
) {
  return normalizeRoleFlags(
    viewer.roleClaims?.find((claim) => claim.providerId === providerId)?.flags,
  );
}

export function hasProviderRole(
  viewer: Pick<PhiAccessViewer, "roleClaims">,
  providerId: PhiRoleProviderId,
  roleFlag: number,
) {
  const normalizedRoleFlag = normalizeRoleFlags(roleFlag);
  return normalizedRoleFlag !== 0 &&
    (getPhiViewerRoleFlags(viewer, providerId) & normalizedRoleFlag) !== 0;
}

export function hasPhiBaseRole(
  viewer: Pick<PhiAccessViewer, "roleClaims">,
  roleFlag: number,
) {
  return hasProviderRole(viewer, PHI_CORE_ROLE_PROVIDER_ID, roleFlag);
}

export function hasProviderGroup(
  viewer: Pick<PhiAccessViewer, "groupClaims">,
  providerId: PhiGroupProviderId,
  groupKey: string,
) {
  return viewer.groupClaims?.some((claim) =>
    claim.providerId === providerId && claim.key === groupKey,
  ) === true;
}

export function hasProviderAddonRole(
  viewer: Pick<PhiAccessViewer, "addonRoleClaims">,
  providerId: PhiRoleProviderId,
  role: string,
) {
  return viewer.addonRoleClaims?.some((claim) =>
    claim.providerId === providerId && claim.roles.includes(role),
  ) === true;
}

export function canPhiViewerAccess(
  viewer: PhiAccessViewer,
  policy: PhiViewerAccessPolicy | null | undefined,
) {
  const resolvedPolicy = policy ?? PHI_VIEWER_ACCESS_ANYONE;
  if (resolvedPolicy.access === "anyone") {
    return true;
  }
  if (resolvedPolicy.access === "anonymous") {
    return viewer.access !== "authenticated";
  }
  if (viewer.access !== "authenticated") {
    return false;
  }
  if (resolvedPolicy.access === "authenticated") {
    return true;
  }
  if (hasPhiBaseRole(viewer, PhiBaseRole.Admin)) {
    return true;
  }
  if (resolvedPolicy.access === "groups") {
    return resolvedPolicy.allowedGroupKeys.some((key) =>
      hasProviderGroup(viewer, resolvedPolicy.providerId, key),
    );
  }
  if (resolvedPolicy.access === "addon-roles") {
    return resolvedPolicy.allowedRoles.some((role) =>
      hasProviderAddonRole(viewer, resolvedPolicy.providerId, role),
    );
  }
  return (
    resolvedPolicy.allowedRoleFlags > 0 &&
    (
      getPhiViewerRoleFlags(viewer, resolvedPolicy.providerId) &
      resolvedPolicy.allowedRoleFlags
    ) !== 0
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
