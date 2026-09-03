/**
 * The membership ladder, taken from the contract rather than mirrored here.
 *
 * Mirroring is what went wrong: this file counted three levels where phis counts four, so what it
 * called a Manager was phis's Editor. A selector offering it granted a level without the bit that
 * administers membership, and a member list showed a level the viewer did not hold.
 *
 * The UI still decides nothing with these -- who may set which level is settled server-side -- but it
 * has to name and offer them, and it can only do that against the same ladder.
 */

export {
  PhiGroupMembershipFlags,
  PHI_GROUP_MEMBERSHIP_LEVELS,
  readPhiGroupMembershipLevel as normalizePhiGroupMembershipFlags,
  type PhiGroupMembershipFlagValue,
} from "@phis/contracts/site-groups";
