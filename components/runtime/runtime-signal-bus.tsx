"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
} from "react";

import type {
  PhiSignal,
  PhiSignalAction,
  PhiSignalAddress,
  PhiSignalRuntimeContext,
  PhiSignalValue,
  PhiSignalValueType,
} from "../../types/signals";
import { readPhiSignalValueSchema } from "../../types/signals";
import {
  matchesPhiSignalRuntimeContext,
  resolvePhiSignalDeliverability,
  resolvePhiSignalReceiverScope,
  resolvePhiSignalDeliveryPartition,
} from "./runtime-signal-registry";
import {
  usePhiSignalRuntimePartition,
  type PhiSignalRuntimePartition,
} from "./runtime-signal-partition";

export type PhiSignalFilter = {
  scopes?: readonly PhiSignal["scope"][];
  channels?: readonly PhiSignal["channel"][];
  actions?: readonly PhiSignalAction[];
  valueSchemas?: readonly NonNullable<PhiSignal["valueSchema"]>[];
  receiver?: PhiSignal["receiver"];
  context?: PhiSignalRuntimeContext;
};

const runtimeOriginId =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type PhiSignalInput = Omit<PhiSignal, "originId" | "correlationId" | "timestamp"> & {
  originId?: string | null;
  correlationId?: string | null;
  timestamp?: number | null;
};

export type PhiSignalDispatch = (signal: PhiSignalInput) => void;

export function createPhiSignalCorrelationId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function matchesPhiSignalFilter(
  partition: PhiSignalRuntimePartition,
  signal: PhiSignal,
  filter: PhiSignalFilter | undefined,
) {
  if (!filter) {
    return true;
  }
  if (filter.scopes && !filter.scopes.includes(signal.scope)) {
    return false;
  }
  if (filter.channels && !filter.channels.includes(signal.channel)) {
    return false;
  }
  if (filter.actions && !filter.actions.includes(signal.action)) {
    return false;
  }
  if (filter.valueSchemas && (!signal.valueSchema || !filter.valueSchemas.includes(signal.valueSchema))) {
    return false;
  }
  if (filter.receiver !== undefined && signal.receiver !== filter.receiver) {
    return false;
  }
  return !filter.context || matchesPhiSignalRuntimeContext(filter.context, partition.context);
}

/**
 * The emission path a pending signal is coalesced on.
 *
 * A route is a sender addressing a channel and action, which is what this reconstructs: `routeKey`
 * names the declaration but never travels on the wire, so this is the closest identity a receiver
 * can be given. Two sends along the same path while the receiver is absent are one wait, and the
 * later value is the one worth keeping.
 */
function resolvePhiPendingSignalKey(signal: PhiSignal) {
  return `${signal.sender ?? "-"}|${signal.scope}|${signal.channel}|${signal.action}`;
}

function deliverPhiSignalNow(deliveryPartition: PhiSignalRuntimePartition, signal: PhiSignal) {
  for (const listener of deliveryPartition.listeners) {
    listener(signal);
  }
}

/*
 * Partitions whose pending queue is already watched.
 *
 * The flush hangs off `instanceSubscribers`, which both a registering instance and a subscribing
 * listener already notify -- the two halves of becoming usable, in whichever order a widget's
 * effects happen to run. Subscribing lazily keeps a partition that never defers anything free of it.
 */
const watchedPhiSignalPartitions = new WeakSet<PhiSignalRuntimePartition>();

function watchPhiSignalPartition(partition: PhiSignalRuntimePartition) {
  if (watchedPhiSignalPartitions.has(partition)) {
    return;
  }
  watchedPhiSignalPartitions.add(partition);
  partition.instanceSubscribers.add(() => flushPendingPhiSignals(partition));
}

function holdPhiSignal(
  deliveryPartition: PhiSignalRuntimePartition,
  receiver: PhiSignalAddress,
  signal: PhiSignal,
) {
  let byRoute = deliveryPartition.pendingSignals.get(receiver);
  if (!byRoute) {
    byRoute = new Map();
    deliveryPartition.pendingSignals.set(receiver, byRoute);
  }
  const key = resolvePhiPendingSignalKey(signal);
  byRoute.set(key, { signal, queuedAt: byRoute.get(key)?.queuedAt ?? Date.now() });
  watchPhiSignalPartition(deliveryPartition);
  reportPhiReceiverThatNobodyAnswers(deliveryPartition, receiver);
}

/*
 * How long a hold may last before it is worth saying that nobody is behind the address.
 *
 * Long enough for a mount, a chunk and a re-render, short enough to be noticed while the click that
 * caused it is still in mind. Nothing is retried when it elapses -- the flush already runs on every
 * registration -- so the only cost of the wait being wrong is a line in the console.
 */
const PHI_SIGNAL_UNANSWERED_RECEIVER_DELAY_MS = 5_000;

const reportedUnansweredPhiReceivers = new Set<PhiSignalAddress>();

/**
 * A receiver that exists and hears nothing, said out loud.
 *
 * Holding an addressed signal is right when the receiver has not mounted yet, and the flush delivers
 * it the moment it does. But a receiver whose instance is registered while no listener answers for it
 * is a different state entirely: it is finished mounting and it will never hear anything, and the
 * signal waits for a flush that can only ever conclude the same thing again.
 *
 * That is a wiring fault -- a Controller subscribing without naming the address it answers for, which
 * cost an afternoon on the media inspector -- and it looked exactly like nothing at all: no drop, no
 * warning, an empty form and a Save that did nothing. Held is not delivered; where the wait cannot
 * end, it says so.
 */
function reportPhiReceiverThatNobodyAnswers(
  partition: PhiSignalRuntimePartition,
  receiver: PhiSignalAddress,
) {
  if (process.env.NODE_ENV !== "development" || reportedUnansweredPhiReceivers.has(receiver)) {
    return;
  }
  setTimeout(() => {
    if (
      reportedUnansweredPhiReceivers.has(receiver) ||
      !partition.instances.has(receiver) ||
      (partition.receiverListenerCounts.get(receiver) ?? 0) > 0 ||
      !partition.pendingSignals.get(receiver)?.size
    ) {
      return;
    }
    reportedUnansweredPhiReceivers.add(receiver);
    console.warn(
      `[phi-signals] ${receiver} is registered but no listener answers for it, so ` +
      `${partition.pendingSignals.get(receiver)?.size ?? 0} signal(s) are held and will not arrive. ` +
      "A listener says which addresses it answers for when it subscribes.",
    );
  }, PHI_SIGNAL_UNANSWERED_RECEIVER_DELAY_MS);
}

function flushPendingPhiSignals(partition: PhiSignalRuntimePartition) {
  if (partition.pendingSignals.size === 0) {
    return;
  }

  for (const [receiver, byRoute] of [...partition.pendingSignals]) {
    for (const [key, pending] of [...byRoute]) {
      // The scope is resolved on the way out, not on the way in: the receiver that turned up while
      // this waited is the one that says which scope it answers in.
      const signal = withPhiSignalReceiverScope(partition, pending.signal);
      const deliverability = resolvePhiSignalDeliverability(partition, signal);
      if (deliverability === "pending") {
        continue;
      }
      byRoute.delete(key);
      if (deliverability !== "deliverable") {
        continue;
      }
      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[phi-signal] ${key} -> ${receiver} delivered after waiting ${Date.now() - pending.queuedAt}ms for its receiver`,
        );
      }
      deliverPhiSignalNow(resolvePhiSignalDeliveryPartition(partition, signal), signal);
    }
    if (byRoute.size === 0) {
      partition.pendingSignals.delete(receiver);
    }
  }
}

/**
 * The scope the receiver answers in, put on the signal before anybody filters by it.
 *
 * A concrete address is registered in exactly one scope, so the scope a sender names is a repetition
 * of something the receiver already states -- and one that could disagree. What a route declared is
 * not consulted; a broadcast keeps its own, because there the scope really is the address.
 */
function withPhiSignalReceiverScope(partition: PhiSignalRuntimePartition, signal: PhiSignal) {
  const receiverScope = resolvePhiSignalReceiverScope(partition, signal.receiver);
  return receiverScope && receiverScope !== signal.scope
    ? { ...signal, scope: receiverScope }
    : signal;
}

function deliverPhiSignal(partition: PhiSignalRuntimePartition, input: PhiSignal) {
  const signal = withPhiSignalReceiverScope(partition, input);
  const deliveryPartition = resolvePhiSignalDeliveryPartition(partition, signal);
  const deliverability = resolvePhiSignalDeliverability(partition, signal);
  if (deliverability === "deliverable") {
    deliverPhiSignalNow(deliveryPartition, signal);
    return;
  }

  /*
   * A receiver that has not mounted yet keeps the signal instead of losing it.
   *
   * Overlay bodies mount on first open, so a controller that answers a row action addresses a widget
   * that does not exist for another render. Holding the signal until the address is usable is what
   * makes the first click behave like every later one, without a widget knowing anything new.
   */
  if (deliverability === "pending" && signal.receiver != null && signal.receiver !== "broadcast") {
    holdPhiSignal(deliveryPartition, signal.receiver, signal);
    return;
  }

  warnAboutUndeliverablePhiSignal(deliveryPartition, signal);
}

/*
 * Addresses already complained about, so a change signal on every keystroke says it once.
 *
 * Keyed by what makes the fault, not by the value that carried it: a wiring is static, so the set is
 * bounded by the number of wrong routes on the page -- which is the number somebody is about to fix.
 */
const reportedUndeliverablePhiSignals = new Set<string>();

/**
 * What was thrown away, said out loud.
 *
 * `pending` is a receiver that has not mounted yet and is held; `undeliverable` is a fault -- an
 * address nothing answers to, or one answering in a different scope -- and it is dropped. Silently,
 * until now, which is how the same mistake cost an afternoon four times: a Select that would not
 * disable, an Overlay that would not open, Undo and Redo that did nothing when pressed. Every one of
 * them was one of these lines, and none of them was printed.
 *
 * It says it on a live page too. Nothing is drawn, so a visitor sees nothing; and a wiring that names
 * an address nobody answers to is not a state a Site is meant to be in.
 */
function warnAboutUndeliverablePhiSignal(
  deliveryPartition: PhiSignalRuntimePartition,
  signal: PhiSignal,
) {
  if (signal.receiver == null) {
    return;
  }
  const key = `${signal.receiver}|${signal.scope}|${signal.channel}|${signal.action}`;
  if (reportedUndeliverablePhiSignals.has(key)) {
    return;
  }
  reportedUndeliverablePhiSignals.add(key);
  const registered = signal.receiver === "broadcast"
    ? null
    : deliveryPartition.instances.get(signal.receiver);
  console.warn(
    `[phi-signals] Dropped ${signal.channel}/${signal.action} to ${signal.receiver}: ` +
    (signal.receiver === "broadcast"
      ? `nothing may be broadcast in "${signal.scope}" scope.`
      : registered
        ? `sent in "${signal.scope}" scope, but the receiver is registered in "${registered.scope}". ` +
          "A receiver hears only in the scope it registered under."
        : `no receiver is registered at that address in "${signal.scope}" scope.`),
    { sender: signal.sender ?? null },
  );
}

export function subscribePhiSignals(
  partition: PhiSignalRuntimePartition,
  listener: (signal: PhiSignal) => void,
  filter?: PhiSignalFilter,
  readyReceiver?: PhiSignalAddress | readonly PhiSignalAddress[] | null,
) {
  const wrappedListener = (signal: PhiSignal) => {
    if (matchesPhiSignalFilter(partition, signal, filter)) {
      listener(signal);
    }
  };
  partition.listeners.add(wrappedListener);
  /*
   * One listener may answer for several addresses.
   *
   * A Command Toolbar is the case that asks for it: it listens once and answers for its own address
   * and for every button inside it, each of which is addressed separately. Naming only one of them
   * left the others registered but unheard -- an addressed signal to them was held forever, which is
   * why a Save button never learned it should read "Create" and Undo never learned it was disabled.
   */
  const receiverCandidate = readyReceiver === undefined ? filter?.receiver : readyReceiver;
  const receivers = (Array.isArray(receiverCandidate) ? receiverCandidate : [receiverCandidate])
    .filter((candidate): candidate is PhiSignalAddress =>
      typeof candidate === "string" && candidate !== "broadcast");
  for (const receiver of receivers) {
    partition.receiverListenerCounts.set(
      receiver,
      (partition.receiverListenerCounts.get(receiver) ?? 0) + 1,
    );
  }
  if (receivers.length > 0) {
    for (const subscriber of partition.instanceSubscribers) subscriber();
  }

  return () => {
    partition.listeners.delete(wrappedListener);
    for (const receiver of receivers) {
      const remaining = (partition.receiverListenerCounts.get(receiver) ?? 1) - 1;
      if (remaining > 0) partition.receiverListenerCounts.set(receiver, remaining);
      else partition.receiverListenerCounts.delete(receiver);
    }
    if (receivers.length > 0) {
      for (const subscriber of partition.instanceSubscribers) subscriber();
    }
  };
}

export function inferPhiSignalValueType(value: PhiSignalValue): PhiSignalValueType {
  if (value == null) {
    return "none";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "number") ? "number[]" : "string[]";
  }
  if (typeof value === "object") {
    return "json";
  }
  return "string";
}

function createPhiSignal(signal: PhiSignalInput): PhiSignal {
  const value = signal.value ?? null;
  const valueType = signal.valueType ?? inferPhiSignalValueType(value);
  const valueSchema = valueType === "json" ? readPhiSignalValueSchema(signal.valueSchema) : null;

  return {
    ...signal,
    value,
    valueType,
    valueSchema,
    originId: signal.originId ?? runtimeOriginId,
    correlationId: signal.correlationId ?? createPhiSignalCorrelationId(),
    timestamp: signal.timestamp ?? Date.now(),
  };
}

export function emitPhiSignal(
  partition: PhiSignalRuntimePartition,
  signal: PhiSignalInput,
) {
  const resolvedSignal = createPhiSignal(signal);
  queueMicrotask(() => {
    deliverPhiSignal(partition, resolvedSignal);
  });
}

export function usePhiSignalDispatcher(): PhiSignalDispatch {
  const partition = usePhiSignalRuntimePartition();
  return useCallback((signal: PhiSignalInput) => {
    emitPhiSignal(partition, signal);
  }, [partition]);
}

export function usePhiSignalListener(
  handler: (signal: PhiSignal) => void,
  filter?: PhiSignalFilter | null,
  readyReceiver?: PhiSignalAddress | readonly PhiSignalAddress[] | null,
) {
  const partition = usePhiSignalRuntimePartition();
  const handleSignal = useEffectEvent((signal: PhiSignal) => {
    handler(signal);
  });

  useEffect(() => {
    if (filter === null) {
      return undefined;
    }
    return subscribePhiSignals(partition, handleSignal, filter, readyReceiver);
  }, [filter, partition, readyReceiver]);
}
