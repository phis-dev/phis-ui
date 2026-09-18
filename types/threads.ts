/**
 * Threads, as this package reads them.
 *
 * Nothing here is defined here. The vocabulary lives in `@phis/contracts/threads` because three ends
 * read it -- phi-server, which stores a thread; this package, which renders one; and an Add-on, which
 * is handed a bounded view through the ABI. A second spelling in any of them is the one that drifts.
 *
 * What this file adds is the boundary: a Module declares a need with `threadKinds`, and the names it
 * uses are the contract's, so a Module and the control plane that materializes its declaration cannot
 * come to mean different things by the same word. The bit values sit in `constants/threads.ts`, where
 * the rest of the values carried through from the contract are.
 */

export type {
  PhisDeclarableThreadKind,
  PhisThreadDetail,
  PhisThreadKindValue,
  PhisThreadMessage,
  PhisThreadMessageAsset,
  PhisThreadMessageAuthor,
  PhisThreadParticipant,
  PhisThreadStatusValue,
  PhisThreadSummary,
} from "@phis/contracts/threads";
