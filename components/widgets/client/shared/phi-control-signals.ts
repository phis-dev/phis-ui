"use client";

import { useCallback, useMemo, useState } from "react";

import type { PhiSignal, PhiSignalAction, PhiSignalScope, PhiSignalChannel, PhiSignalValue, PhiSignalValueType } from "../../../../types";
import type { PhiSignalAddress, PhiSignalRouteSet } from "../../../../types/signals";
import { findPhiSignalRoutesByCapabilityId } from "../../../../types/signals";
import { usePhiSignalListener } from "../../../runtime/runtime-signal-bus";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../../../runtime/runtime-signal-identity";

export type PhiControlSignalEventValue = "submit" | "focus" | "blur" | "clear";
export type PhiControlSignalCommandValue =
  | "clear"
  | "enable"
  | "disable"
  | "toggle";

export type PhiControlSignalControllerOptions<TValue> = {
  key?: string | null;
  valueType?: PhiSignalValueType | null;
  sender?: PhiSignalAddress | null;
  signalRoutes?: PhiSignalRouteSet | null;
  typeKey?: string | null;
  signalsEnabled?: boolean;
  initialDisabled?: boolean;
  initialReadOnly?: boolean;
  clearValue?: TValue;
  onSetValue?: (nextValue: TValue) => void;
  onClear?: () => void;
  onFocusRequest?: () => void;
  onBlurRequest?: () => void;
  onToggleRequest?: () => void;
  onReceiveCapability?: (capabilityId: string, signal: PhiSignal) => boolean | void;
  coerceValue?: (value: unknown) => TValue | null;
};

export type PhiControlSignalController<TValue> = {
  key: string;
  signalScope: PhiSignalScope;
  channel: PhiSignalChannel;
  sender: PhiSignalAddress | null;
  disabled: boolean;
  readOnly: boolean;
  emitState: (nextValue: TValue) => void;
  emitEvent: (eventValue: PhiControlSignalEventValue) => void;
  emitChange: (nextValue: TValue) => void;
  emitSubmit: () => void;
  emitFocus: () => void;
  emitBlur: () => void;
  emitClear: () => void;
  emitCapability: (capabilityId: string, value: PhiSignalValue | PhiControlSignalEventValue) => void;
};

function isPhiControlCommandValue(value: unknown): value is PhiControlSignalCommandValue {
  if (
    value === "clear" ||
    value === "enable" ||
    value === "disable" ||
    value === "toggle"
  ) {
    return true;
  }

  return false;
}

function defaultCoerceValue<TValue>(value: unknown) {
  return value as TValue;
}

export function usePhiControlSignalController<TValue = unknown>({
  key,
  valueType = "string",
  sender,
  signalRoutes = null,
  signalsEnabled = true,
  initialDisabled = false,
  initialReadOnly = false,
  clearValue,
  onSetValue,
  onClear,
  onFocusRequest,
  onBlurRequest,
  onToggleRequest,
  onReceiveCapability,
  coerceValue = defaultCoerceValue<TValue>,
}: PhiControlSignalControllerOptions<TValue>): PhiControlSignalController<TValue> {
  const signalIdentity = usePhiSignalIdentity();
  const resolvedKey = key?.trim() || "input";
  const emitRoutes = useMemo(() => signalRoutes?.emits ?? [], [signalRoutes?.emits]);
  const listenRoutes = useMemo(() => signalRoutes?.listens ?? [], [signalRoutes?.listens]);
  const primaryEmitRoute = emitRoutes[0] ?? null;
  const primaryListenRoute = listenRoutes[0] ?? null;
  const signalScope = primaryEmitRoute?.scope ?? primaryListenRoute?.scope ?? "widget";
  const signalChannel = primaryEmitRoute?.channel ?? primaryListenRoute?.channel ?? "value";
  const signalValueType = primaryEmitRoute?.valueType ?? valueType ?? "string";
  const [commandDisabled, setCommandDisabled] = useState<boolean | null>(null);
  const disabled = commandDisabled ?? initialDisabled;
  const readOnly = initialReadOnly;

  const signalSender = useMemo(
    () => (sender === undefined ? signalIdentity.sender : sender),
    [sender, signalIdentity.sender],
  );
  const emitSignal = usePhiSignalEmitter(signalSender);

  const emit = useCallback(
    (
      capabilityId: string,
      action: PhiSignalAction,
      value: PhiSignalValue | PhiControlSignalEventValue,
      nextValueType?: PhiSignalValueType,
    ) => {
      const routes = findPhiSignalRoutesByCapabilityId(emitRoutes, capabilityId);
      if (!signalsEnabled || routes.length === 0) {
        return;
      }
      for (const route of routes) {
        if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) {
          continue;
        }
        emitSignal({
          scope: route.scope,
          channel: route.channel,
          action: route.action ?? action,
          value: route.valueType === "none" ? null : value as PhiSignalValue,
          valueType: nextValueType ?? route.valueType ?? (value == null ? "none" : signalValueType),
          valueSchema: route.valueSchema ?? null,
          receiver: route.receiver,
          timestamp: Date.now(),
        });
      }
    },
    [emitRoutes, emitSignal, signalsEnabled, signalValueType],
  );

  const emitMutation = useCallback(
    (
      capabilityId: string,
      action: PhiSignalAction,
      value: PhiSignalValue | PhiControlSignalEventValue,
      nextValueType?: PhiSignalValueType,
    ) => {
      if (readOnly) {
        return;
      }

      emit(capabilityId, action, value, nextValueType);
    },
    [emit, readOnly],
  );

  const handleSignal = useCallback(
    (signal: PhiSignal) => {
      if (!signalsEnabled || listenRoutes.length === 0) {
        return;
      }

      const route = listenRoutes.find((candidate) =>
        candidate.channel === signal.channel &&
        candidate.action === signal.action &&
        candidate.valueType === signal.valueType &&
        (
          candidate.valueType !== "json" ||
          (candidate.valueSchema != null && candidate.valueSchema === signal.valueSchema)
        ) &&
        candidate.receiver !== null,
      );
      if (!route) {
        return;
      }
      const action = signal.action;
      const value = signal.value;
      const targetsCurrentControl = signal.receiver === "broadcast" || (signalSender != null && signal.receiver === signalSender);
      if (!targetsCurrentControl) {
        return;
      }
      if (onReceiveCapability?.(route.capabilityId, signal) === true) {
        return;
      }

      if (action === "clear" || value === "clear") {
        onClear?.();
        if (clearValue !== undefined) {
          onSetValue?.(clearValue);
        }
        return;
      }
      if (signal.channel === "focused" && action === "change") {
        if (value === false) {
          onBlurRequest?.();
        } else {
          onFocusRequest?.();
        }
        return;
      }
      if (signal.channel === "focused" && value === true) {
        onFocusRequest?.();
        return;
      }
      if (signal.channel === "focused" && value === false) {
        onBlurRequest?.();
        return;
      }
      if (action === "change" && signal.channel === "enabled") {
        setCommandDisabled(typeof value === "boolean" ? !value : false);
        return;
      }
      if (action === "toggle" || value === "toggle") {
        onToggleRequest?.();
        return;
      }

      const command = value;
      if (action === "change") {
        const nextValue = coerceValue(value);
        if (nextValue != null) {
          onSetValue?.(nextValue);
        }
        return;
      }
      if (isPhiControlCommandValue(command)) {
        if (command === "enable") {
          setCommandDisabled(false);
          return;
        }
        if (command === "disable") {
          setCommandDisabled(true);
          return;
        }
      }
    },
    [
      clearValue,
      coerceValue,
      onBlurRequest,
      onClear,
      onFocusRequest,
      onReceiveCapability,
      onSetValue,
      onToggleRequest,
      signalSender,
      signalsEnabled,
      listenRoutes,
    ],
  );

  const signalFilter = useMemo(
    () => {
      if (listenRoutes.length === 0) {
        return null;
      }

      const valueSchemas = Array.from(
        new Set(listenRoutes.map((route) => route.valueSchema).filter((schema): schema is NonNullable<typeof schema> => Boolean(schema))),
      );

      return {
        scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
        channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
        ...(valueSchemas.length > 0 ? { valueSchemas } : null),
      };
    },
    [listenRoutes],
  );

  usePhiSignalListener(handleSignal, signalFilter, signalSender);

  const emitControlEvent = useCallback(
    (eventValue: PhiControlSignalEventValue) => {
      if (eventValue === "submit") {
        emitMutation("submit", "activate", null, "none");
        return;
      }

      if (eventValue === "focus" || eventValue === "blur") {
        emit(eventValue, "change", eventValue === "focus", "boolean");
        return;
      }

      emitMutation("clear", "clear", null, "none");
    },
    [emit, emitMutation],
  );
  const emitCapability = useCallback(
    (capabilityId: string, value: PhiSignalValue | PhiControlSignalEventValue) => emitMutation(capabilityId, "activate", value),
    [emitMutation],
  );

  return {
    key: resolvedKey,
    signalScope,
    channel: signalChannel,
    sender: signalSender,
    disabled,
    readOnly,
    emitState: (nextValue) => emitMutation("change", "change", nextValue as PhiSignalValue),
    emitEvent: emitControlEvent,
    emitChange: (nextValue) => emitMutation("change", "change", nextValue as PhiSignalValue),
    emitSubmit: () => emitControlEvent("submit"),
    emitFocus: () => emitControlEvent("focus"),
    emitBlur: () => emitControlEvent("blur"),
    emitClear: () => emitMutation("clear", "clear", null, "none"),
    emitCapability,
  };
}
