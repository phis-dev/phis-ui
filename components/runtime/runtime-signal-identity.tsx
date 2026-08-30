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
  PhiSignalSender,
  PhiSignalScope,
} from "../../types";
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
