// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePhiStateMachineBinding } from "./phi-state-machine-binding";
import type { PhiStateMachineDefinition } from "../../types/state-machine";

/**
 * The half of the binding that needs React, proven where it runs.
 *
 * Everything decided from arguments is tested in `helpers/state-machine-binding.test.ts`. What is left
 * here is what only a mounted binding has: a position two callers can see in one tick, a snapshot that
 * has to re-derive when data changes under an unchanged state, and the book-keeping that tells an
 * expected answer from a contradiction.
 *
 * Each test names its own machine, because the diagnostics' deduplication set is deliberately not
 * resettable.
 */

function client(machineKey: string): PhiStateMachineDefinition {
  return {
    machineKey,
    version: 3,
    authority: "client",
    persistence: "profile",
    initial: "idle",
    statements: ["idle", "complete"],
    snapshotSchema: "@phis/ui/signals/testMachine",
    states: { idle: { statements: ["idle"] }, running: {}, done: { statements: ["complete"] } },
    transitions: {
      start: { from: "idle", event: "start", to: "running" },
      finish: { from: "running", event: "finish", to: "done" },
    },
  };
}

function projection(machineKey: string): PhiStateMachineDefinition {
  return { ...client(machineKey), authority: "server", reader: "fetchPhiAuthWorkflow", persistence: "server" };
}

function reference(machineKey: string) {
  return { ownerModuleId: "@acme/test/modules/test", machineKey } as const;
}

describe("a mounted binding", () => {
  /*
   * The one the linter caught. The snapshot memo is keyed on the rendered position, so data arriving for
   * a state the machine is already in has to change that position -- otherwise a second factor's method
   * key would go on showing the first one's.
   */
  it("re-derives the snapshot when only the data changed", () => {
    const definition = projection("same-state-new-data");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("same-state-new-data"),
    }));

    act(() => result.current.project("running", { methodKey: "totp" }));
    expect(result.current.snapshot.data).toEqual({ methodKey: "totp" });

    act(() => result.current.project("running", { methodKey: "recovery-code" }));
    expect(result.current.snapshot.state).toBe("running");
    expect(result.current.snapshot.data).toEqual({ methodKey: "recovery-code" });
  });

  /*
   * The only reason the ref exists. A Controller answering one event by raising the next is ordinary,
   * and React state read back in the same tick would still say "idle" -- the second send would then be
   * resolved from the wrong state and refused.
   */
  it("lets two sends in one tick see each other", () => {
    const definition = client("two-sends");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("two-sends"),
    }));

    let second: ReturnType<typeof result.current.send> | undefined;
    act(() => {
      result.current.send("start");
      second = result.current.send("finish");
    });

    expect(second?.taken).toBe(true);
    expect(result.current.snapshot.state).toBe("done");
    expect(result.current.snapshot.statements).toEqual({ idle: false, complete: true });
  });

  it("hands back a checkpoint for a machine that keeps one", () => {
    const definition = client("checkpointing");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("checkpointing"),
    }));

    let sent: ReturnType<typeof result.current.send> | undefined;
    act(() => { sent = result.current.send("start"); });
    expect(sent?.checkpoint).toEqual({ version: 3, state: "running" });
  });

  it("starts from a kept position, and from the beginning when its version moved on", () => {
    const definition = client("restoring");
    const resumed = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("restoring"),
      restored: { version: 3, state: "running" },
    }));
    expect(resumed.result.current.snapshot.state).toBe("running");

    const stale = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("restoring"),
      restored: { version: 2, state: "running" },
    }));
    expect(stale.result.current.snapshot.state).toBe("idle");
  });
});

describe("a projection", () => {
  /*
   * The structural half of `authority`. The effects go out, because that is how the request reaches
   * Core, but the position does not move -- a binding that guessed the outcome would be showing a state
   * no server ever said.
   */
  it("sends without moving, and moves only when projected", () => {
    const definition = projection("asks-only");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("asks-only"),
    }));

    let sent: ReturnType<typeof result.current.send> | undefined;
    act(() => { sent = result.current.send("start"); });
    expect(sent?.taken).toBe(false);
    expect(sent?.checkpoint).toBeNull();
    expect(result.current.snapshot.state).toBe("idle");

    act(() => result.current.project("running"));
    expect(result.current.snapshot.state).toBe("running");
  });

  it("says nothing when the answer it was owed arrives", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const definition = projection("expected");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("expected"),
    }));

    act(() => { result.current.send("start"); });
    act(() => result.current.project("running"));
    expect(error).not.toHaveBeenCalled();
  });

  /*
   * A projection's first state always arrives unasked: the host mounts, reads, and hands over whatever
   * Core said. Reporting that would have put a line in the console on every sign-in.
   */
  it("says nothing about the first state it is handed", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const definition = projection("first-read");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("first-read"),
    }));

    act(() => result.current.project("running"));
    expect(result.current.snapshot.state).toBe("running");
    expect(error).not.toHaveBeenCalled();
  });

  it("reports a later state that arrives with nothing having been asked", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const definition = projection("surprised");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("surprised"),
    }));

    act(() => result.current.project("running"));
    expect(error).not.toHaveBeenCalled();

    act(() => result.current.project("done"));
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0]?.[0])).toContain("without anything having been sent");
    // The server's answer still wins -- reporting is not refusing.
    expect(result.current.snapshot.state).toBe("done");
  });

  it("refuses a state its own definition does not describe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const definition = projection("unknown-answer");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("unknown-answer"),
    }));

    act(() => result.current.project("recovering"));
    expect(result.current.snapshot.state).toBe("idle");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("a client machine", () => {
  it("says so when a host pushes a state into it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const definition = client("pushed-into");
    const { result } = renderHook(() => usePhiStateMachineBinding({
      definition,
      reference: reference("pushed-into"),
    }));

    act(() => result.current.project("running"));
    expect(result.current.snapshot.state).toBe("idle");
    expect(String(warn.mock.calls[0]?.[0])).toContain("owns its own");
  });
});
