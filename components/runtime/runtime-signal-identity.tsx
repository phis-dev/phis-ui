"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type {
  PhiSignalAddress,
  PhiSignalRoute,
  PhiSignalSender,
  PhiSignalScope,
  PhiSignalValue,
} from "../../types";
import { findPhiSignalRoutesByCapabilityId } from "../../types/signals";
import { usePhiSignalDispatcher, type PhiSignalInput } from "./runtime-signal-bus";

export type PhiSignalIdentity = {
  sender: PhiSignalSender;
  receiver?: PhiSignalAddress | null;
  scope?: PhiSignalScope | null;
};

const PhiSignalIdentityContext = createContext<PhiSignalIdentity>({
  sender: null,
  receiver: null,
  scope: null,
});

const PhiRuntimeSignalEmissionsEnabledContext = createContext(true);

export function PhiRuntimeSignalEmissionBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const parentEnabled = useContext(PhiRuntimeSignalEmissionsEnabledContext);

  return (
    <PhiRuntimeSignalEmissionsEnabledContext.Provider value={parentEnabled && enabled}>
      {children}
    </PhiRuntimeSignalEmissionsEnabledContext.Provider>
  );
}

export function PhiSignalIdentityProvider({
  value,
  children,
}: {
  value: PhiSignalIdentity;
  children: ReactNode;
}) {
  const normalizedValue = useMemo<PhiSignalIdentity>(
    () => ({
      sender: value.sender ?? null,
      receiver: value.receiver ?? null,
      scope: value.scope ?? null,
    }),
    [value.receiver, value.scope, value.sender],
  );

  return (
    <PhiSignalIdentityContext.Provider value={normalizedValue}>
      {children}
    </PhiSignalIdentityContext.Provider>
  );
}

export function usePhiSignalIdentity() {
  return useContext(PhiSignalIdentityContext);
}

export function usePhiSignalEmitter(explicitSender?: PhiSignalSender) {
  const identity = usePhiSignalIdentity();
  const dispatchSignal = usePhiSignalDispatcher();
  const runtimeSignalEmissionsEnabled = useContext(PhiRuntimeSignalEmissionsEnabledContext);
  const sender = explicitSender === undefined ? identity.sender : explicitSender;

  return useCallback(
    (signal: Omit<PhiSignalInput, "sender"> & { sender?: PhiSignalSender }) => {
      if (!runtimeSignalEmissionsEnabled) {
        return;
      }
      dispatchSignal({
        ...signal,
        sender: signal.sender === undefined ? sender : signal.sender,
      });
    },
    [dispatchSignal, runtimeSignalEmissionsEnabled, sender],
  );
}

export type PhiSignalEmitter = ReturnType<typeof usePhiSignalEmitter>;

/**
 * Sends one capability of a surface's own down every emit route declared for it.
 *
 * The Form and the Overlay each carried this loop; a Control goes through
 * `usePhiControlSignalController` instead, which also listens and has no correlation to pass on. A
 * route without a receiver is not wired yet, and a JSON route without a schema could not be read by
 * anyone, so neither is sent. A route whose value type is `none` carries no value whatever was given.
 */
export function emitPhiSignalCapability(
  emitSignal: PhiSignalEmitter,
  routes: readonly PhiSignalRoute[] | null | undefined,
  capabilityId: string,
  value: PhiSignalValue,
  correlationId?: string | null,
) {
  for (const route of findPhiSignalRoutesByCapabilityId(routes, capabilityId)) {
    if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) continue;
    emitSignal({
      scope: route.scope,
      channel: route.channel,
      action: route.action,
      value: route.valueType === "none" ? null : value,
      valueType: route.valueType,
      valueSchema: route.valueSchema ?? null,
      receiver: route.receiver,
      ...(correlationId ? { correlationId } : {}),
    });
  }
}
