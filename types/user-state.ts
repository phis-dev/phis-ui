/**
 * User state, as this package reads it.
 *
 * Nothing here is defined here. The vocabulary lives in `@phis/contracts/user-state` because two ends
 * check the same write -- phi-server, which stores it on the membership row and decides, and this
 * package, which declares the keys and refuses a malformed value before sending one. A second spelling
 * of the shapes in either of them is the one that drifts.
 *
 * What this file adds is the boundary: a Module declares what it keeps with `userState`, using the
 * contract's own names, so a Module and the server that admits its writes cannot come to mean different
 * things by the same word. The shape names and the write reader sit in `constants/user-state.ts`, where
 * the rest of the values carried through from a contract are.
 *
 * The declaration is discipline rather than permission. phi-server never sees it: what admits a write
 * there is the key's prefix against the Modules this Site runs, and the shape the write itself names.
 */

export type {
  PhisDeclarableUserStateKey,
  PhisUserStateFlag,
  PhisUserStateKey,
  PhisUserStateMarker,
  PhisUserStateSet,
  PhisUserStateShape,
  PhisUserStateStoredValue,
  PhisUserStateValue,
  PhisUserStateWriteShape,
} from "@phis/contracts/user-state";
