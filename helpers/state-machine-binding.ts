import { evaluatePhiRuntimeConditionExpression } from "../types/runtime-condition";
import type { PhiRuntimeConditionSourceValues } from "../types/runtime-condition";
import type {
  PhiStateMachineCheckpoint,
  PhiStateMachineDefinition,
  PhiStateMachineReference,
  PhiStateMachineSnapshot,
  PhiStateMachineTransition,
} from "../types/state-machine";

/**
 * Running a machine, with nothing React in it.
 *
 * The half of `PhiStateMachineBinding` that decides things, kept separate from the half that holds
 * state, the way `helpers/table-binding.ts` sits beside `phi-table-binding.ts`. Everything here is a
 * function of its arguments: a transition is resolved, a snapshot is derived, a checkpoint is read back.
 * Nothing dispatches, navigates, writes or logs -- the hook does the first three through its host, and
 * the diagnostics belong to the hook because they are about a running machine rather than about a
 * definition.
 */

/**
 * Why an event did not move the machine, when it did not.
 *
 * Three outcomes and not one boolean, because the host has to tell them apart and so does the reader of
 * a log line. `refused` is the ordinary case and says nothing out loud; `unknown-event` is a wiring
 * fault; `unknown-state` means the machine is somewhere its own definition does not describe, which is
 * the one that cannot be recovered from by sending something else.
 */
export type PhiStateMachineRefusal = "refused" | "unknown-event" | "unknown-state";

export type PhiStateMachineResolution =
  | {
      readonly taken: true;
      readonly transitionKey: string;
      readonly transition: PhiStateMachineTransition;
    }
  | { readonly taken: false; readonly refusal: PhiStateMachineRefusal };

/**
 * Which transition an event takes from where the machine is now.
 *
 * Guards are `PhiRuntimeConditionExpression`s, evaluated exactly as a `visibleWhen` is, and only
 * `matched` takes a transition. `unavailable` -- a guard whose source has not answered -- counts as not
 * taken rather than as a maybe, and that is safe to do quietly because
 * `collectPhiStateMachineDefinitionErrors` has already refused any guarded `(from, event)` without an
 * unguarded fallback. So a guard that cannot answer falls through to the transition its author declared
 * for exactly that case, instead of the machine sitting still for a reason nobody wrote down.
 *
 * Guarded transitions are tried before the unguarded one regardless of where they sit in the object,
 * because position carries no meaning in these objects. The unguarded one is the fallback by being
 * unguarded, not by being last.
 */
export function resolvePhiStateMachineTransition(
  definition: PhiStateMachineDefinition,
  from: string,
  event: string,
  sources: PhiRuntimeConditionSourceValues,
): PhiStateMachineResolution {
  if (!Object.hasOwn(definition.states, from)) {
    return { taken: false, refusal: "unknown-state" };
  }

  let fallback: { key: string; transition: PhiStateMachineTransition } | null = null;
  let candidates = 0;

  for (const [transitionKey, transition] of Object.entries(definition.transitions)) {
    if (transition.from !== from || transition.event !== event) continue;
    candidates += 1;
    if (!transition.when) {
      fallback = { key: transitionKey, transition };
      continue;
    }
    if (evaluatePhiRuntimeConditionExpression(transition.when, sources) === "matched") {
      return { taken: true, transitionKey, transition };
    }
  }

  if (fallback) {
    return { taken: true, transitionKey: fallback.key, transition: fallback.transition };
  }
  return { taken: false, refusal: candidates > 0 ? "refused" : "unknown-event" };
}

/**
 * What the machine looks like from outside, which is never its state key.
 *
 * Every published statement appears with a boolean, including the false ones, so a reader can tell
 * "this machine says no" from "this machine does not publish that at all" -- a distinction that decides
 * whether a wrong answer is a state the reader has not handled or a name it has misspelled.
 */
export function readPhiStateMachineSnapshot(
  definition: PhiStateMachineDefinition,
  reference: PhiStateMachineReference,
  state: string,
  data?: Readonly<Record<string, unknown>>,
): PhiStateMachineSnapshot {
  const published = new Set(definition.states[state]?.statements ?? []);
  const statements: Record<string, boolean> = {};
  for (const statement of definition.statements) {
    statements[statement] = published.has(statement);
  }
  return {
    machine: reference,
    version: definition.version,
    state,
    statements,
    ...(data ? { data } : {}),
  };
}

/**
 * The position to hand the host for keeping, or null when this machine keeps none.
 *
 * `server` returns null because the authoritative store is the one that has it already -- a projection
 * writing its own copy back would be inventing a second answer to a question it does not decide. `none`
 * returns null because that is what `none` means.
 *
 * Whether every checkpoint is worth what it costs is not settled here, and under `profile` it costs a
 * round trip. This hands the host one at every state change and leaves the host to decide; a declared
 * answer -- a state saying it is worth persisting -- is the obvious next shape if that turns out to be
 * too many.
 */
export function readPhiStateMachineCheckpoint(
  definition: PhiStateMachineDefinition,
  state: string,
): PhiStateMachineCheckpoint | null {
  if (definition.persistence === "none" || definition.persistence === "server") return null;
  return { version: definition.version, state };
}

/**
 * A kept position read back, or null when it may not be trusted.
 *
 * A version mismatch discards rather than migrates: the version is the identity of persisted state, so
 * a position recorded under another one belongs to a different machine that happened to share a name.
 * A state key the definition no longer has is discarded on the same grounds. Both are silent, because
 * both are what the version is for -- and the host starting from `initial` is the correct outcome, not
 * a failure to report.
 */
export function restorePhiStateMachineState(
  definition: PhiStateMachineDefinition,
  checkpoint: PhiStateMachineCheckpoint | null | undefined,
): string | null {
  if (!checkpoint || checkpoint.version !== definition.version) return null;
  return Object.hasOwn(definition.states, checkpoint.state) ? checkpoint.state : null;
}

/**
 * Whether a projected state is one this definition describes.
 *
 * Asked of the answer a `server` authority reader brought back, because that answer comes from another
 * process on its own release cycle. A state phi-server knows and this definition does not is the
 * divergence the binding reports -- and it refuses to display it rather than adding it to the state set,
 * since a state with no declared statements would publish nothing and read as "everything is false".
 */
export function isPhiStateMachineState(definition: PhiStateMachineDefinition, state: string) {
  return Object.hasOwn(definition.states, state);
}
