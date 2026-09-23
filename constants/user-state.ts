/*
 * The shape names, the limits and the write reader are the contract phis checks against, so they live
 * in `@phis/contracts/user-state` and are only carried through here, where the rest of the vocabulary a
 * surface needs at runtime already is. The types are in `types/user-state.ts`.
 */
export {
  PHIS_USER_STATE_MAX_KEY_LENGTH,
  PHIS_USER_STATE_MAX_SERIALIZED_BYTES,
  PHIS_USER_STATE_MAX_SET_LIMIT,
  PHIS_USER_STATE_SHAPES,
  isPhisDeclarableUserStateKey,
  isPhisUserStateKey,
  isPhisUserStateShape,
  readPhisUserStateWrite,
} from "@phis/contracts/user-state";
