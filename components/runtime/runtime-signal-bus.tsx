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
  canDeliverPhiSignalToReceiver,
  matchesPhiSignalRuntimeContext,
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

function deliverPhiSignal(partition: PhiSignalRuntimePartition, signal: PhiSignal) {
  if (!canDeliverPhiSignalToReceiver(partition, signal)) {
    return;
  }

  const deliveryPartition = resolvePhiSignalDeliveryPartition(partition, signal);
  for (const listener of deliveryPartition.listeners) {
    listener(signal);
  }
}

export function subscribePhiSignals(
  partition: PhiSignalRuntimePartition,
  listener: (signal: PhiSignal) => void,
  filter?: PhiSignalFilter,
  readyReceiver?: PhiSignalAddress | null,
) {
  const wrappedListener = (signal: PhiSignal) => {
    if (matchesPhiSignalFilter(partition, signal, filter)) {
      listener(signal);
    }
  };
  partition.listeners.add(wrappedListener);
  const receiverCandidate = readyReceiver === undefined ? filter?.receiver : readyReceiver;
  const receiver = receiverCandidate && receiverCandidate !== "broadcast"
    ? receiverCandidate
    : null;
  if (receiver) {
    partition.receiverListenerCounts.set(
      receiver,
      (partition.receiverListenerCounts.get(receiver) ?? 0) + 1,
    );
    for (const subscriber of partition.instanceSubscribers) subscriber();
  }

  return () => {
    partition.listeners.delete(wrappedListener);
    if (receiver) {
      const remaining = (partition.receiverListenerCounts.get(receiver) ?? 1) - 1;
      if (remaining > 0) partition.receiverListenerCounts.set(receiver, remaining);
      else partition.receiverListenerCounts.delete(receiver);
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
  readyReceiver?: PhiSignalAddress | null,
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
