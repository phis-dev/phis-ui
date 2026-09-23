import { describe, expect, it } from "vitest";

import { isPhisUserStateKey } from "../constants/user-state";
import {
  collectPhiStateMachineDefinitionErrors,
  createPhiStateMachineUserStateKey,
  type PhiStateMachineDefinition,
} from "./state-machine";

/**
 * What a definition has to survive before a host will run it.
 *
 * Most of these are the determinism rules, and they exist because the transition shape is flat. Nesting
 * transitions under `from` and then `event` would have made a second unguarded transition unwriteable,
 * at the price of making the guarded alternative unwriteable too. The trade was taken deliberately, so
 * what the nesting would have enforced is checked here instead -- which only counts if it is tested.
 */

const AUTH = "@phis/ui/modules/auth" as const;

function definition(patch: Partial<PhiStateMachineDefinition> = {}): PhiStateMachineDefinition {
  return {
    machineKey: "workflow",
    version: 1,
    authority: "client",
    persistence: "none",
    initial: "idle",
    statements: ["idle", "complete"],
    snapshotSchema: "@phis/ui/signals/authWorkflow",
    states: {
      idle: { statements: ["idle"] },
      running: {},
      done: { statements: ["complete"] },
    },
    transitions: {
      start: { from: "idle", event: "start", to: "running" },
      finish: { from: "running", event: "finish", to: "done" },
    },
    ...patch,
  } as PhiStateMachineDefinition;
}

describe("a state machine definition", () => {
  it("passes when it is consistent", () => {
    expect(collectPhiStateMachineDefinitionErrors(definition())).toEqual([]);
  });

  it("refuses two unguarded transitions out of the same event", () => {
    const errors = collectPhiStateMachineDefinitionErrors(definition({
      transitions: {
        start: { from: "idle", event: "start", to: "running" },
        startAgain: { from: "idle", event: "start", to: "done" },
      },
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("depends on object order");
  });

  /*
   * The failure this one prevents is the quietest in the family: every guard says no, the event is
   * consumed, and the machine sits where it was with nothing written down anywhere.
   */
  it("refuses a guarded set with no unguarded fallback", () => {
    const errors = collectPhiStateMachineDefinitionErrors(definition({
      transitions: {
        startIfReady: {
          from: "idle",
          event: "start",
          to: "running",
          when: { source: "feature", valuePath: "auth.password", operator: "truthy" },
        },
      },
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("dead end");
  });

  it("accepts a guarded alternative once a fallback is there", () => {
    expect(collectPhiStateMachineDefinitionErrors(definition({
      transitions: {
        startIfReady: {
          from: "idle",
          event: "start",
          to: "running",
          when: { source: "feature", valuePath: "auth.password", operator: "truthy" },
        },
        startOtherwise: { from: "idle", event: "start", to: "done" },
      },
    }))).toEqual([]);
  });

  it("refuses a state key nothing declares, from either end of a transition", () => {
    const errors = collectPhiStateMachineDefinitionErrors(definition({
      transitions: {
        start: { from: "nowhere", event: "start", to: "running" },
        finish: { from: "running", event: "finish", to: "elsewhere" },
      },
    }));
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("leaves undeclared state");
    expect(errors[1]).toContain("targets undeclared state");
  });

  it("refuses an initial state that does not exist", () => {
    const errors = collectPhiStateMachineDefinitionErrors(definition({ initial: "elsewhere" }));
    expect(errors).toEqual([
      'workflow: initial state "elsewhere" is not among the declared states.',
    ]);
  });

  /*
   * A state publishing something the machine never declared would put a name into the world that no
   * reader can have planned for, which is the open set this whole mechanism exists to close.
   */
  it("refuses a statement the machine does not publish", () => {
    const errors = collectPhiStateMachineDefinitionErrors(definition({
      states: {
        idle: { statements: ["idle"] },
        running: { statements: ["halfway"] },
        done: { statements: ["complete"] },
      },
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('publishes "halfway"');
  });

  it("refuses a projection without a reader", () => {
    const errors = collectPhiStateMachineDefinitionErrors(
      { ...definition(), authority: "server", reader: "  " } as PhiStateMachineDefinition,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("needs a reader");
  });

  it("refuses a snapshot schema that is not one", () => {
    const errors = collectPhiStateMachineDefinitionErrors(
      definition({ snapshotSchema: "authWorkflow" as never }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("<package>/signals/<key>");
  });

  it("refuses an external event no transition answers", () => {
    const errors = collectPhiStateMachineDefinitionErrors(
      definition({ acceptsExternalEvents: ["enroll"] }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("no transition responds to it");
  });
});

describe("a profile checkpoint key", () => {
  /*
   * The one assumption in this file that spans two systems: the key is derived rather than declared,
   * so it has to land inside a grammar written in another package. If it ever stops doing so, every
   * `profile` machine is refused by the store at the first write, with nothing here to say why.
   */
  it("is a user-state key the store will accept", () => {
    const key = createPhiStateMachineUserStateKey({ ownerModuleId: AUTH, machineKey: "workflow" });
    expect(key).toBe("@phis/ui/modules/auth/workflow");
    expect(isPhisUserStateKey(key)).toBe(true);
  });

  it("puts the owning Module's id in front, which is what authorizes the write", () => {
    const key = createPhiStateMachineUserStateKey({
      ownerModuleId: "@acme/shop/modules/checkout",
      machineKey: "cart",
    });
    expect(key.startsWith("@acme/shop/modules/checkout/")).toBe(true);
    expect(isPhisUserStateKey(key)).toBe(true);
  });
});
