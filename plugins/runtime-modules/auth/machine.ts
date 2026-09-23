import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";
import type {
  PhiStateMachineDefinition,
  PhiStateMachineReference,
} from "../../../types/state-machine";

/**
 * Where a viewer stands in signing in, as Core decides it and this package only shows it.
 *
 * The first consumer of [design/STATE_MACHINES.md](../../../design/STATE_MACHINES.md), and the reason
 * `server` authority exists. `phis-server` AUTHENTICATION.md §9 forbids the browser reconstructing the
 * authentication state machine; until now there was nowhere else to put it, so the second-factor state
 * arrived as a field on the login response and lived in a Widget's `useState` -- which a reload threw
 * away, for a state Core would still have answered for.
 *
 * Under `server` authority there is no local transition function to write, so that failure mode is not
 * available here. An event is a request; `project()` brings back whatever Core said.
 */

export const PHI_AUTH_MACHINE_KEY = "workflow";

export const PHI_AUTH_MACHINE_REFERENCE: PhiStateMachineReference = {
  ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
  machineKey: PHI_AUTH_MACHINE_KEY,
};

/**
 * What the Widgets around it are allowed to ask, and the whole of it.
 *
 * Each of these is positive on purpose. `noStepRunning()` in the login preset reads a negation today --
 * "nothing is happening" -- and a negation over an open set of states is right until the machine gains
 * one, then silently wrong: it would show the sign-in form during a recovery nobody told it about.
 * A state added later publishes none of these until its author says so, so a reader asking
 * `awaitingCredentials` gets `false` from a state it has never heard of, which is the safe answer.
 */
export const PHI_AUTH_MACHINE_STATEMENTS = {
  /** Nobody is part-way through anything: the sign-in form is the thing to show. */
  awaitingCredentials: "awaitingCredentials",
  /** A second factor is owed, so everything offering a fresh start must stand back. */
  stepRunning: "stepRunning",
  /** Core considers this Session authenticated. */
  complete: "complete",
} as const;

/**
 * Four states, which is what Core actually distinguishes.
 *
 * `serializeAuthWorkflow` in phis-server answers three -- the two intermediate ones and `complete` --
 * and a request without a Session answers 401, which is `anonymous`. The design document also listed
 * `primary-verified`; it is deliberately absent, because nothing on either side can produce it and a
 * state no answer can reach is the vocabulary-without-a-mechanism that `capabilitiesByArea` already
 * demonstrates.
 *
 * `to` on a transition under `server` authority is the expectation and not the outcome. The binding
 * takes the effects and leaves the position alone; Core's next answer decides where the machine
 * actually lands.
 */
export const PHI_AUTH_MACHINE_DEFINITION: PhiStateMachineDefinition = {
  machineKey: PHI_AUTH_MACHINE_KEY,
  version: 1,
  authority: "server",
  reader: "fetchPhiAuthWorkflow",
  persistence: "server",
  initial: "anonymous",
  statements: [
    PHI_AUTH_MACHINE_STATEMENTS.awaitingCredentials,
    PHI_AUTH_MACHINE_STATEMENTS.stepRunning,
    PHI_AUTH_MACHINE_STATEMENTS.complete,
  ],
  snapshotSchema: "@phis/ui/signals/authWorkflowState",
  states: {
    anonymous: {
      statements: [PHI_AUTH_MACHINE_STATEMENTS.awaitingCredentials],
      capability: "primary-login",
    },
    "factor-enrollment-required": {
      statements: [PHI_AUTH_MACHINE_STATEMENTS.stepRunning],
      capability: "factor-enrollment",
    },
    "factor-challenge-required": {
      statements: [PHI_AUTH_MACHINE_STATEMENTS.stepRunning],
      capability: "factor-challenge",
    },
    complete: {
      statements: [PHI_AUTH_MACHINE_STATEMENTS.complete],
    },
  },
  transitions: {
    /*
     * Primary credentials went in. Core answers whether that was the whole of it or whether a factor
     * is owed, so this asks and waits rather than deciding.
     */
    authenticated: { from: "anonymous", event: "authenticated", to: "complete", effects: [{ kind: "read" }] },
    enrolled: {
      from: "factor-enrollment-required",
      event: "factorSettled",
      to: "complete",
      effects: [{ kind: "read" }],
    },
    challenged: {
      from: "factor-challenge-required",
      event: "factorSettled",
      to: "complete",
      effects: [{ kind: "read" }],
    },
  },
  /*
   * Nothing from outside this Module. Reading where somebody stands in signing in is one thing; raising
   * an event in it is another, and `server` authority softens that only halfway -- Core still decides
   * the outcome, but a foreign `factorSettled` is still an interference.
   */
};
