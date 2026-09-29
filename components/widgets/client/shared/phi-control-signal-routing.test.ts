import { describe, expect, it } from "vitest";

import type { PhiSignal } from "../../../../types";
import type { PhiSignalRoute } from "../../../../types/signals";
import { findPhiControlListenRoute, readPhiControlSignalCommand } from "./phi-control-signal-routing";

/**
 * A Control hears a signal through a route that matches every addressing fact, and does what
 * `channel` and `action` say -- never what the value happens to spell.
 */

function route(overrides: Partial<PhiSignalRoute> = {}): PhiSignalRoute {
  return {
    routeKey: "text-value",
    capabilityId: "change",
    scope: "page",
    channel: "text",
    action: "change",
    valueType: "string",
    receiver: "broadcast",
    ...overrides,
  };
}

function signal(overrides: Partial<PhiSignal> = {}): PhiSignal {
  return {
    originId: "origin",
    scope: "page",
    channel: "text",
    action: "change",
    value: "hello",
    valueType: "string",
    receiver: "broadcast",
    correlationId: "correlation",
    timestamp: 0,
    ...overrides,
  };
}

describe("findPhiControlListenRoute", () => {
  it("finds the route that carries the signal", () => {
    const listens = [route()];
    expect(findPhiControlListenRoute(listens, signal())).toBe(listens[0]);
  });

  it("does not take a route written for another scope", () => {
    expect(findPhiControlListenRoute([route({ scope: "area" })], signal())).toBeNull();
  });

  it("picks the route of the signal's scope when two differ only there", () => {
    const listens = [
      route({ routeKey: "area-text", capabilityId: "areaChange", scope: "area" }),
      route({ routeKey: "page-text", capabilityId: "pageChange", scope: "page" }),
    ];
    expect(findPhiControlListenRoute(listens, signal())?.capabilityId).toBe("pageChange");
  });

  it("needs channel, action and value type to agree", () => {
    const listens = [route()];
    expect(findPhiControlListenRoute(listens, signal({ channel: "color" }))).toBeNull();
    expect(findPhiControlListenRoute(listens, signal({ action: "clear" }))).toBeNull();
    expect(findPhiControlListenRoute(listens, signal({ valueType: "number" }))).toBeNull();
  });

  it("needs the value schema to agree for json", () => {
    const listens = [route({ valueType: "json", valueSchema: "@phis/ui/signals/tableSelection" })];
    expect(findPhiControlListenRoute(listens, signal({
      valueType: "json",
      valueSchema: "@phis/ui/signals/tableSelection",
    }))).toBe(listens[0]);
    expect(findPhiControlListenRoute(listens, signal({
      valueType: "json",
      valueSchema: "@phis/ui/signals/backgroundConfig",
    }))).toBeNull();
  });

  it("ignores an unwired route", () => {
    expect(findPhiControlListenRoute([route({ receiver: null })], signal())).toBeNull();
  });
});

describe("readPhiControlSignalCommand", () => {
  it("sets a value that spells a command word instead of obeying it", () => {
    for (const word of ["clear", "toggle", "enable", "disable", "reset"]) {
      expect(readPhiControlSignalCommand(signal({ value: word }))).toEqual({ kind: "set", value: word });
    }
  });

  it("does nothing for a command word sent with a non-setting action", () => {
    expect(readPhiControlSignalCommand(signal({ action: "activate", value: "clear" }))).toBeNull();
    expect(readPhiControlSignalCommand(signal({ action: "activate", value: "disable" }))).toBeNull();
  });

  it("clears and toggles on the action", () => {
    expect(readPhiControlSignalCommand(signal({ action: "clear", value: null, valueType: "none" })))
      .toEqual({ kind: "clear" });
    expect(readPhiControlSignalCommand(signal({ action: "toggle", value: null, valueType: "none" })))
      .toEqual({ kind: "toggle" });
  });

  it("reads focus and enabled from their channels", () => {
    expect(readPhiControlSignalCommand(signal({ channel: "focused", value: true })))
      .toEqual({ kind: "focus" });
    expect(readPhiControlSignalCommand(signal({ channel: "focused", value: false })))
      .toEqual({ kind: "blur" });
    expect(readPhiControlSignalCommand(signal({ channel: "enabled", value: false })))
      .toEqual({ kind: "enabled", enabled: false });
    expect(readPhiControlSignalCommand(signal({ channel: "enabled", value: "disable" }))).toBeNull();
  });
});
