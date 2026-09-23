import { describe, expect, it } from "vitest";

import {
  readPhiStateMachineCheckpoint,
  readPhiStateMachineSnapshot,
  resolvePhiStateMachineTransition,
  restorePhiStateMachineState,
} from "./state-machine-binding";
import type { PhiStateMachineDefinition } from "../types/state-machine";

/**
 * What a machine does with an event, decided without React in the room.
 *
 * The cases worth writing down are the ones where an answer is missing rather than wrong: a guard whose
 * source has not spoken, a position kept under a version that no longer exists, a state key from a
 * server on its own release cycle. Each has an obvious wrong answer that would look like it worked.
 */

const AUTH = { ownerModuleId: "@phis/ui/modules/auth", machineKey: "workflow" } as const;

const machine: PhiStateMachineDefinition = {
  machineKey: "workflow",
  version: 2,
  authority: "client",
  persistence: "profile",
  initial: "idle",
  statements: ["idle", "complete"],
  snapshotSchema: "@phis/ui/signals/authWorkflow",
  states: {
    idle: { statements: ["idle"] },
    running: {},
    done: { statements: ["complete"] },
  },
  transitions: {
    startWhenReady: {
      from: "idle",
      event: "start",
      to: "running",
      when: { source: "feature", valuePath: "auth.password", operator: "truthy" },
    },
    startOtherwise: { from: "idle", event: "start", to: "done" },
    finish: { from: "running", event: "finish", to: "done" },
  },
};

describe("resolving a transition", () => {
  it("takes the guarded one when its guard matches", () => {
    const resolution = resolvePhiStateMachineTransition(machine, "idle", "start", {
      features: { auth: { password: true } },
    });
    expect(resolution).toMatchObject({ taken: true, transitionKey: "startWhenReady" });
  });

  it("falls back when the guard says no", () => {
    const resolution = resolvePhiStateMachineTransition(machine, "idle", "start", {
      features: { auth: { password: false } },
    });
    expect(resolution).toMatchObject({ taken: true, transitionKey: "startOtherwise" });
  });

  /*
   * The case the validator's fallback rule exists for. A guard whose source has not answered is not a
   * maybe -- it is "not this one" -- and the unguarded transition is there precisely so that saying so
   * costs nothing. Without the rule this would be a machine sitting still for an unwritten reason.
   */
  it("falls back when the guard cannot be answered at all", () => {
    const resolution = resolvePhiStateMachineTransition(machine, "idle", "start", {});
    expect(resolution).toMatchObject({ taken: true, transitionKey: "startOtherwise" });
  });

  it("separates an event nobody declared from a guard that refused", () => {
    expect(resolvePhiStateMachineTransition(machine, "running", "start", {}))
      .toEqual({ taken: false, refusal: "unknown-event" });

    const guardedOnly: PhiStateMachineDefinition = {
      ...machine,
      transitions: { startWhenReady: machine.transitions.startWhenReady },
    };
    expect(resolvePhiStateMachineTransition(guardedOnly, "idle", "start", {
      features: { auth: { password: false } },
    })).toEqual({ taken: false, refusal: "refused" });
  });

  it("reports a position its own definition does not describe", () => {
    expect(resolvePhiStateMachineTransition(machine, "elsewhere", "start", {}))
      .toEqual({ taken: false, refusal: "unknown-state" });
  });
});

describe("a snapshot", () => {
  /*
   * Every statement carries a boolean, including the false ones. A reader that gets `undefined` cannot
   * tell "this machine says no" from "you have misspelled the name", and those want different fixes.
   */
  it("answers every published statement, not only the true ones", () => {
    expect(readPhiStateMachineSnapshot(machine, AUTH, "running")).toEqual({
      machine: AUTH,
      version: 2,
      state: "running",
      statements: { idle: false, complete: false },
    });
  });

  it("carries the state key only to the owner, and the statements to everyone", () => {
    const snapshot = readPhiStateMachineSnapshot(machine, AUTH, "done", { methodKey: "totp" });
    expect(snapshot.statements).toEqual({ idle: false, complete: true });
    expect(snapshot.data).toEqual({ methodKey: "totp" });
  });
});

describe("keeping a position", () => {
  it("hands one over for query and profile", () => {
    expect(readPhiStateMachineCheckpoint(machine, "running")).toEqual({ version: 2, state: "running" });
    expect(readPhiStateMachineCheckpoint({ ...machine, persistence: "query" }, "running"))
      .toEqual({ version: 2, state: "running" });
  });

  /*
   * A projection writing its own copy back would be inventing a second answer to a question it does not
   * decide, so `server` keeps nothing -- the authoritative store has it already.
   */
  it("hands none over for none and server", () => {
    expect(readPhiStateMachineCheckpoint({ ...machine, persistence: "none" }, "running")).toBeNull();
    expect(readPhiStateMachineCheckpoint({ ...machine, persistence: "server" }, "running")).toBeNull();
  });

  it("discards a position kept under another version", () => {
    expect(restorePhiStateMachineState(machine, { version: 1, state: "running" })).toBeNull();
    expect(restorePhiStateMachineState(machine, { version: 2, state: "running" })).toBe("running");
  });

  it("discards a state the definition has since dropped", () => {
    expect(restorePhiStateMachineState(machine, { version: 2, state: "recovering" })).toBeNull();
  });

  it("treats nothing kept as nothing kept", () => {
    expect(restorePhiStateMachineState(machine, null)).toBeNull();
    expect(restorePhiStateMachineState(machine, undefined)).toBeNull();
  });
});
