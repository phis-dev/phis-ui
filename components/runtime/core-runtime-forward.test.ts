import { describe, expect, it } from "vitest";

import { emitPhiSignal, subscribePhiSignals } from "./runtime-signal-bus";
import { registerPhiSignalInstance } from "./runtime-signal-registry";
import type { PhiSignalRuntimePartition } from "./runtime-signal-partition";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignal, type PhiSignalAddress } from "../../types/signals";

/**
 * The last step of signing in: a Controller in the Area asks the runtime to forward.
 *
 * It is worth a test of its own because nothing about it is visible when it fails. The sign-in itself
 * succeeds, the session is set, and the visitor is left looking at the sign-in page -- so the failure
 * reads as "the login is broken" rather than "a signal was never delivered".
 */

const AUTH_CONTROLLER = "controller:@phis/ui/modules/auth/controller/default:default" as PhiSignalAddress;

function createPartition(
  kind: "site" | "area",
  parent: PhiSignalRuntimePartition | null = null,
): PhiSignalRuntimePartition {
  return {
    id: kind,
    kind,
    context: { siteKey: null, area: null, pageKey: null, regionKey: null, slotKey: null },
    parent,
    listeners: new Set(),
    receiverListenerCounts: new Map(),
    instances: new Map(),
    instanceSubscribers: new Set(),
    pendingSignals: new Map(),
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function forward(from: PhiSignalRuntimePartition) {
  emitPhiSignal(from, {
    scope: "site",
    channel: "path",
    action: "activate",
    value: { path: "/en/admin", replace: true },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeNavigation,
    sender: AUTH_CONTROLLER,
    receiver: createPhiCoreRuntimeControllerAddress(),
  });
}

/*
 * The step before it: the Form Widget reporting its result to the Auth Controller. Same page, same
 * partition, but a Widget address speaking to a Controller address in Area scope.
 */
describe("reporting a sign-in result to the Auth Controller", () => {
  it("reaches a Controller mounted in the same Area", async () => {
    const area = createPartition("area", createPartition("site"));
    const received: PhiSignal[] = [];

    registerPhiSignalInstance(area, { address: AUTH_CONTROLLER, scope: "area" });
    subscribePhiSignals(area, (signal) => received.push(signal), {
      scopes: ["area"],
      channels: ["command", "dialog", "submit"],
      actions: ["open", "close", "activate"],
      receiver: AUTH_CONTROLLER,
    });

    emitPhiSignal(area, {
      scope: "area",
      channel: "submit",
      action: "activate",
      value: { ok: true, status: 200, payload: { area: "admin" } },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      sender: "cms:EQFba9rSPg5Q2ZK2" as PhiSignalAddress,
      receiver: AUTH_CONTROLLER,
    });
    await settle();

    expect(received.map((signal) => signal.channel)).toEqual(["submit"]);
  });
});

describe("forwarding through the Runtime Controller", () => {
  it("reaches the adapter from an Area partition", async () => {
    const site = createPartition("site");
    const area = createPartition("area", site);
    const address = createPhiCoreRuntimeControllerAddress();
    const received: PhiSignal[] = [];

    registerPhiSignalInstance(site, { address, scope: "site" });
    subscribePhiSignals(site, (signal) => received.push(signal), {
      scopes: ["site"],
      receiver: address,
    }, address);

    forward(area);
    await settle();

    expect(received.map((signal) => signal.channel)).toEqual(["path"]);
  });

  /*
   * Listening is not the same as existing: an address nobody registered holds its signals rather than
   * delivering them, and the wait never ends. This is what a sign-in ran into.
   */
  it("is held, not delivered, while the address is only listened to", async () => {
    const site = createPartition("site");
    const area = createPartition("area", site);
    const address = createPhiCoreRuntimeControllerAddress();
    const received: PhiSignal[] = [];

    subscribePhiSignals(site, (signal) => received.push(signal), {
      scopes: ["site"],
      receiver: address,
    }, null);

    forward(area);
    await settle();

    expect(received).toEqual([]);
  });
});
