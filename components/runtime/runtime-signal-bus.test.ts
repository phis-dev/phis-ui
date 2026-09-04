import { describe, expect, it } from "vitest";

import { emitPhiSignal, subscribePhiSignals } from "./runtime-signal-bus";
import { registerPhiSignalInstance } from "./runtime-signal-registry";
import type { PhiSignalRuntimePartition } from "./runtime-signal-partition";
import type { PhiSignal, PhiSignalAddress } from "../../types/signals";

/**
 * Delivery to a receiver that has not mounted yet.
 *
 * The rule under test is not "signals are retained" but something narrower: a route persists only if
 * its receiver exists in the same page revision, so an address that is missing at emission time is a
 * promise not yet kept. Holding the signal for it is what makes a first click on a lazily mounted
 * overlay behave like every later one. Everything else -- a wrong address, a mismatched scope, a
 * broadcast -- must still be dropped, or the queue becomes a place where mistakes go to hide.
 */

const RECEIVER = "cms:widget-detail" as PhiSignalAddress;
const SENDER = "controller:builder" as PhiSignalAddress;

function createPartition(): PhiSignalRuntimePartition {
  return {
    id: "test",
    kind: "area",
    context: { siteKey: null, area: null, pageKey: null, regionKey: null, slotKey: null },
    parent: null,
    listeners: new Set(),
    receiverListenerCounts: new Map(),
    instances: new Map(),
    instanceSubscribers: new Set(),
    pendingSignals: new Map(),
  };
}

function emit(
  partition: PhiSignalRuntimePartition,
  overrides: Partial<Parameters<typeof emitPhiSignal>[1]> = {},
) {
  emitPhiSignal(partition, {
    scope: "page",
    channel: "bindingParams",
    action: "change",
    value: { params: { moduleId: "one" } },
    valueType: "json",
    valueSchema: null,
    sender: SENDER,
    receiver: RECEIVER,
    ...overrides,
  });
}

/** `emitPhiSignal` defers delivery by a microtask, so every assertion waits one out. */
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function mount(partition: PhiSignalRuntimePartition, received: PhiSignal[]) {
  const unregister = registerPhiSignalInstance(partition, {
    address: RECEIVER,
    scope: "page",
  });
  const unsubscribe = subscribePhiSignals(
    partition,
    (signal) => received.push(signal),
    { receiver: RECEIVER },
    RECEIVER,
  );
  return () => {
    unsubscribe();
    unregister();
  };
}

describe("deferred signal delivery", () => {
  it("delivers to a receiver that mounts after the signal was sent", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    emit(partition);
    await settle();
    expect(received).toHaveLength(0);

    mount(partition, received);
    await settle();
    expect(received).toHaveLength(1);
    expect(received[0]?.value).toEqual({ params: { moduleId: "one" } });
  });

  it("delivers the held signal once, not again on a later remount", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    emit(partition);
    await settle();

    const unmount = mount(partition, received);
    await settle();
    expect(received).toHaveLength(1);

    unmount();
    mount(partition, received);
    await settle();
    expect(received).toHaveLength(1);
  });

  it("keeps the last value when the same route fires again while the receiver is absent", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    emit(partition);
    emit(partition, { value: { params: { moduleId: "two" } } });
    await settle();

    mount(partition, received);
    await settle();
    expect(received).toHaveLength(1);
    expect(received[0]?.value).toEqual({ params: { moduleId: "two" } });
  });

  it("delivers straight away once the receiver is there, holding nothing", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    mount(partition, received);
    emit(partition);
    await settle();

    expect(received).toHaveLength(1);
    expect(partition.pendingSignals.size).toBe(0);
  });

  it("holds nothing for a broadcast, which names no one to wait for", async () => {
    const partition = createPartition();
    emit(partition, { receiver: "broadcast" });
    await settle();
    expect(partition.pendingSignals.size).toBe(0);
  });

  it("holds nothing for a signal with no receiver at all", async () => {
    const partition = createPartition();
    emit(partition, { receiver: null });
    await settle();
    expect(partition.pendingSignals.size).toBe(0);
  });

  it("drops a held signal whose receiver turns up in another scope", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    emit(partition);
    await settle();
    expect(partition.pendingSignals.size).toBe(1);

    registerPhiSignalInstance(partition, { address: RECEIVER, scope: "area" });
    subscribePhiSignals(partition, (signal) => received.push(signal), { receiver: RECEIVER }, RECEIVER);
    await settle();

    expect(received).toHaveLength(0);
    expect(partition.pendingSignals.size).toBe(0);
  });

  it("waits for the listener, not merely for the instance", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    emit(partition);
    await settle();

    registerPhiSignalInstance(partition, { address: RECEIVER, scope: "page" });
    await settle();
    expect(received).toHaveLength(0);
    expect(partition.pendingSignals.size).toBe(1);

    subscribePhiSignals(partition, (signal) => received.push(signal), { receiver: RECEIVER }, RECEIVER);
    await settle();
    expect(received).toHaveLength(1);
  });

  it("keeps two routes to the same receiver apart", async () => {
    const partition = createPartition();
    const received: PhiSignal[] = [];

    emit(partition);
    emit(partition, { channel: "dialog", action: "activate", value: null, valueType: "none" });
    await settle();

    mount(partition, received);
    await settle();
    expect(received).toHaveLength(2);
    expect(received[0]?.channel).toBe("bindingParams");
    expect(received[1]?.channel).toBe("dialog");
  });
});
