import type { PhiStateMachineRefusal } from "./state-machine-binding";
import type { PhiStateMachineReference } from "../types/state-machine";

/**
 * What a machine would not do, said out loud.
 *
 * Beside the binding rather than inside it, because whether a fault is worth printing is a decision
 * about a definition and not about a component: the same event from the same state is the same fault in
 * a test, in a render, and in a Controller that never renders at all. It is still the binding's and
 * never a host's -- written per host is how `getCsrfToken` ended up with six spellings and logout with
 * three error postures, two of which discarded the failure silently.
 *
 * The levels are the signal bus's three, because a machine's faults are the same three faults and a
 * fourth vocabulary would only mean two things to learn:
 *
 * - `undeliverable` -- a definition names something nothing answers to. `console.warn`, deduplicated,
 *   **in production as well**, on the bus's own reasoning: a wiring that names an address nobody
 *   answers to is not a state a Site is meant to be in.
 * - circulation -- costs counting to notice. `console.error`, **development only**, guarded at the call
 *   site so the bundler takes it out. Divergence sits here.
 * - `pending` -- nothing said. A guard that refuses is this, and so is a transition onto the state the
 *   machine is already in.
 */

/**
 * Faults already said out loud, so a machine sent the same wrong event on every keystroke says it once.
 *
 * Keyed by what makes the fault and never by the value that carried it, exactly as the bus keys its
 * own: a definition is static, so the set is bounded by the number of wrong transitions somebody is
 * about to fix. It is deliberately not resettable -- a test names its own machine and collides with
 * nothing, and a production page that could clear it would report the same fault forever.
 */
const reported = new Set<string>();

function machineLabel(reference: PhiStateMachineReference) {
  return `${reference.ownerModuleId}/${reference.machineKey}`;
}

function sayOnce(key: string, say: () => void) {
  if (reported.has(key)) return false;
  reported.add(key);
  say();
  return true;
}

/**
 * An event that moved nothing.
 *
 * `refused` returns without a word: a guard saying no is the ordinary case and the reason guards exist.
 * The other two are faults in the definition rather than in the run, and `unknown-state` is the one
 * that cannot be recovered from by sending something else, so it says so.
 *
 * Returns whether anything was printed, which is what makes this testable at all.
 */
export function reportPhiStateMachineRefusal(
  reference: PhiStateMachineReference,
  refusal: PhiStateMachineRefusal,
  from: string,
  event: string,
) {
  if (refusal === "refused") return false;
  const machine = machineLabel(reference);
  return sayOnce(`${machine}|${from}|${event}|${refusal}`, () => {
    console.warn(
      refusal === "unknown-state"
        ? `[phi-state-machine] ${machine} is in "${from}", which its definition does not describe. ` +
          "Nothing it is sent can move it from there."
        : `[phi-state-machine] ${machine} has no transition for "${event}" from "${from}".`,
    );
  });
}

/**
 * A host using the binding against its own grain.
 *
 * Both cases are the host's mistake rather than the definition's, and both are invisible otherwise: an
 * event sent to a projection looks like a transition that did not happen, and a state pushed into a
 * client machine looks like one that did.
 */
export function reportPhiStateMachineMisuse(
  reference: PhiStateMachineReference,
  message: string,
) {
  const machine = machineLabel(reference);
  return sayOnce(`${machine}|misuse|${message}`, () => {
    console.warn(`[phi-state-machine] ${machine}: ${message}`);
  });
}

/**
 * A projection contradicting what it was showing, with nothing having been asked.
 *
 * A projection changing state is what a projection does, so this is not every change -- the binding
 * only calls it when no answer was owed. What is left is the surprising kind: another tab finished the
 * flow, a Session expired underneath, or an effect reported a transition the server never made. The
 * server's answer wins either way; this is so the third case does not stay unexplained.
 */
export function reportPhiStateMachineDivergence(
  reference: PhiStateMachineReference,
  shown: string,
  answered: string,
) {
  const machine = machineLabel(reference);
  return sayOnce(`${machine}|diverged|${shown}|${answered}`, () => {
    console.error(
      `[phi-state-machine] ${machine} was showing "${shown}" and a re-read answered "${answered}" ` +
      "without anything having been sent. The server's answer wins. Look for an effect that reported a " +
      "transition the server did not make, or for a second tab.",
    );
  });
}
