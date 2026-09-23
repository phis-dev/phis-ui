import { afterEach, describe, expect, it, vi } from "vitest";

import {
  reportPhiStateMachineDivergence,
  reportPhiStateMachineMisuse,
  reportPhiStateMachineRefusal,
} from "./state-machine-diagnostics";

/**
 * What gets said, and what deliberately does not.
 *
 * The silence is as much the contract as the noise. A guard refusing is the ordinary case, and a
 * runtime that announced every one of them would bury the two faults worth reading -- which is how the
 * signal bus's own undeliverable line went unprinted for four afternoons before somebody added it.
 *
 * Each test names its own machine, because the deduplication set is deliberately not resettable: a
 * production page that could clear it would report the same fault forever.
 */

function machine(key: string) {
  return { ownerModuleId: "@acme/test/modules/test", machineKey: key } as const;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a refusal", () => {
  it("says nothing when a guard simply said no", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(reportPhiStateMachineRefusal(machine("quiet"), "refused", "idle", "start")).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("says an event nobody declared, once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(reportPhiStateMachineRefusal(machine("unwired"), "unknown-event", "idle", "start")).toBe(true);
    expect(reportPhiStateMachineRefusal(machine("unwired"), "unknown-event", "idle", "start")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('no transition for "start" from "idle"');
  });

  /*
   * Deduplication keys on what makes the fault, so a second wrong event still gets heard. The set is
   * bounded by the number of wrong transitions somebody is about to fix, not by how often they fire.
   */
  it("still says a different fault on the same machine", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reportPhiStateMachineRefusal(machine("two-faults"), "unknown-event", "idle", "start");
    reportPhiStateMachineRefusal(machine("two-faults"), "unknown-event", "idle", "finish");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("says a position the definition does not describe, and says it is terminal", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reportPhiStateMachineRefusal(machine("lost"), "unknown-state", "elsewhere", "start");
    expect(warn.mock.calls[0]?.[0]).toContain("Nothing it is sent can move it from there");
  });
});

describe("misuse by a host", () => {
  it("names what the host did rather than what the machine refused", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(reportPhiStateMachineMisuse(machine("misused"), "a state was pushed in")).toBe(true);
    expect(warn.mock.calls[0]?.[0]).toContain("a state was pushed in");
  });
});

describe("divergence", () => {
  /*
   * An error rather than a warning, and the binding only calls it when nothing was asked -- a
   * projection changing state after a request is what a projection is for.
   */
  it("is an error, and names both states and the likely cause", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(reportPhiStateMachineDivergence(machine("diverged"), "running", "idle")).toBe(true);
    const said = String(error.mock.calls[0]?.[0]);
    expect(said).toContain('was showing "running"');
    expect(said).toContain('answered "idle"');
    expect(said).toContain("without anything having been sent");
  });
});
