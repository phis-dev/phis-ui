import { describe, expect, it } from "vitest";

import {
  PHI_AUTH_MACHINE_DEFINITION,
  PHI_AUTH_MACHINE_REFERENCE,
  PHI_AUTH_MACHINE_STATEMENTS,
} from "./machine";
import { readPhiStateMachineSnapshot } from "../../../helpers/state-machine-binding";
import { collectPhiStateMachineDefinitionErrors } from "../../../types/state-machine";

/**
 * The first machine anybody wrote, held to the rules the validator states.
 *
 * Worth its own test rather than trusting the validator's, because the interesting assertions are about
 * this definition and not about the grammar: that every state Core can answer with is described, and
 * that what the login preset needs to ask is answerable from the statements alone.
 */

describe("the auth machine", () => {
  it("passes the definition rules", () => {
    expect(collectPhiStateMachineDefinitionErrors(PHI_AUTH_MACHINE_DEFINITION)).toEqual([]);
  });

  /*
   * `serializeAuthWorkflow` in phis-server answers exactly three states, and a request without a
   * Session answers 401. A state Core can reach and this definition cannot describe would be refused by
   * the binding and leave the machine sitting at `anonymous` while somebody waits for a factor prompt.
   */
  it("describes every state Core can answer with", () => {
    expect(Object.keys(PHI_AUTH_MACHINE_DEFINITION.states).sort()).toEqual([
      "anonymous",
      "complete",
      "factor-challenge-required",
      "factor-enrollment-required",
    ]);
  });

  it("is a projection with a reader", () => {
    expect(PHI_AUTH_MACHINE_DEFINITION.authority).toBe("server");
    expect(PHI_AUTH_MACHINE_DEFINITION).toHaveProperty("reader", "fetchPhiAuthWorkflow");
  });

  it("accepts nothing from outside its own Module", () => {
    expect(PHI_AUTH_MACHINE_DEFINITION.acceptsExternalEvents).toBeUndefined();
  });
});

describe("what the login preset needs to ask", () => {
  function statements(state: string) {
    return readPhiStateMachineSnapshot(
      PHI_AUTH_MACHINE_DEFINITION,
      PHI_AUTH_MACHINE_REFERENCE,
      state,
    ).statements;
  }

  /*
   * This is the reading that replaces `noStepRunning()`. The old one asked a Widget whether a step was
   * running and treated silence as "no" -- so a state nobody had told it about showed the sign-in form
   * in the middle of one. Asking positively means a new state has to opt in to being a place where
   * credentials are collected.
   */
  it("offers credentials only where nobody is part-way through", () => {
    expect(statements("anonymous")[PHI_AUTH_MACHINE_STATEMENTS.awaitingCredentials]).toBe(true);
    for (const state of ["factor-challenge-required", "factor-enrollment-required", "complete"]) {
      expect(statements(state)[PHI_AUTH_MACHINE_STATEMENTS.awaitingCredentials]).toBe(false);
    }
  });

  it("marks both factor states as a step under way, and nothing else", () => {
    expect(statements("factor-challenge-required")[PHI_AUTH_MACHINE_STATEMENTS.stepRunning]).toBe(true);
    expect(statements("factor-enrollment-required")[PHI_AUTH_MACHINE_STATEMENTS.stepRunning]).toBe(true);
    expect(statements("anonymous")[PHI_AUTH_MACHINE_STATEMENTS.stepRunning]).toBe(false);
    expect(statements("complete")[PHI_AUTH_MACHINE_STATEMENTS.stepRunning]).toBe(false);
  });

  /*
   * A reader gets every published name with a boolean, so "this machine says no" is distinguishable
   * from "you asked for something it does not publish".
   */
  it("answers every statement from every state", () => {
    for (const state of Object.keys(PHI_AUTH_MACHINE_DEFINITION.states)) {
      expect(Object.keys(statements(state)).sort()).toEqual([
        "awaitingCredentials",
        "complete",
        "stepRunning",
      ]);
    }
  });
});
