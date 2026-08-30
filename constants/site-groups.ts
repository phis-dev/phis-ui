/**
 * Membership levels are cumulative: a Manager is a Contributor is a Member.
 *
 * The shared UI mirrors the control plane's values so a level can be named in a selector without a
 * round trip. It never decides anything with them -- who may set which level is settled server-side.
 */
export const PhiGroupMembershipFlags = {
  Member: 1,
  Contributor: 1 | 2,
  Manager: 1 | 2 | 4,
} as const;

export type PhiGroupMembershipFlagValue =
  (typeof PhiGroupMembershipFlags)[keyof typeof PhiGroupMembershipFlags];

export const PHI_GROUP_MEMBERSHIP_LEVELS = [
  PhiGroupMembershipFlags.Member,
  PhiGroupMembershipFlags.Contributor,
  PhiGroupMembershipFlags.Manager,
] as const;

export function normalizePhiGroupMembershipFlags(value: unknown): PhiGroupMembershipFlagValue | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  if ((value & 4) !== 0) return PhiGroupMembershipFlags.Manager;
  if ((value & 2) !== 0) return PhiGroupMembershipFlags.Contributor;
  return PhiGroupMembershipFlags.Member;
}
