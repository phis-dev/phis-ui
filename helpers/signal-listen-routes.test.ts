import { describe, expect, it } from "vitest";

import type { PhiSignal, PhiSignalReceiver, PhiSignalRoute } from "../types/signals";
import { findPhiSignalListenRoute, resolvePhiSignalListenFilter } from "./signal-listen-routes";

const self = "widget:a" as PhiSignalReceiver;

const route = (overrides: Partial<PhiSignalRoute> = {}) => ({
  routeKey: "reload",
  capabilityId: "reload",
  scope: "page",
  channel: "table",
  action: "reload",
  valueType: "none",
  valueSchema: null,
  receiver: "widget:a",
  ...overrides,
}) as PhiSignalRoute;

const signal = (overrides: Partial<PhiSignal> = {}) => ({
  originId: "o",
  scope: "page",
  channel: "table",
  action: "reload",
  value: null,
  valueType: "none",
  valueSchema: null,
  receiver: "widget:a",
  correlationId: "c",
  timestamp: 0,
  ...overrides,
}) as PhiSignal;

describe("findPhiSignalListenRoute", () => {
  it("answers a signal to its own address and to a broadcast", () => {
    const routes = [route()];
    expect(findPhiSignalListenRoute(routes, signal(), self)).toBe(routes[0]);
    expect(findPhiSignalListenRoute(routes, signal({ receiver: "broadcast" }), self)).toBe(routes[0]);
  });

  it("ignores a signal aimed at somebody else and a route without a receiver", () => {
    expect(findPhiSignalListenRoute([route()], signal({ receiver: "widget:b" as PhiSignal["receiver"] }), self)).toBeNull();
    expect(findPhiSignalListenRoute([route({ receiver: null as unknown as PhiSignalRoute["receiver"] })], signal(), self)).toBeNull();
  });

  it("compares the schema only for json values", () => {
    const json = route({ valueType: "json", valueSchema: "a" as PhiSignalRoute["valueSchema"] });
    expect(findPhiSignalListenRoute([json], signal({ valueType: "json", valueSchema: "b" as PhiSignal["valueSchema"] }), self)).toBeNull();
    expect(findPhiSignalListenRoute([route()], signal({ valueSchema: "b" as PhiSignal["valueSchema"] }), self)).not.toBeNull();
  });
});

describe("resolvePhiSignalListenFilter", () => {
  it("subscribes to nothing without routes", () => {
    expect(resolvePhiSignalListenFilter([])).toBeNull();
  });

  it("filters by schema only when every route names one", () => {
    const named = route({ valueSchema: "a" as PhiSignalRoute["valueSchema"] });
    expect(resolvePhiSignalListenFilter([named, route()])).toEqual({ scopes: ["page"], channels: ["table"] });
    expect(resolvePhiSignalListenFilter([named])).toEqual({ scopes: ["page"], channels: ["table"], valueSchemas: ["a"] });
  });
});
