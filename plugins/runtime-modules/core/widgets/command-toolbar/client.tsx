"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { PhiCommandToolbarWidgetConfig } from "./config";
import type { PhiCommonControlLabels } from "../../../../../components/widgets/label-types/common-controls";
import { resolvePhiCommonControlAction } from "../../../../../components/widgets/client/shared/phi-common-controls";
import { resolvePhiButtonIcon } from "../../../../../components/widgets/client/shared/phi-button-icons";
import type { PhiSignal, PhiSignalAddress, PhiSignalRoute, PhiSignalValue } from "../../../../../types";
import { createPhiSignalSubcontrolAddress, findPhiSignalRoutesByCapabilityId } from "../../../../../types/signals";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { registerPhiSignalInstance } from "../../../../../components/runtime/runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "../../../../../components/runtime/runtime-signal-partition";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { PhiToolbarControl } from "../../../../../components/controls/phi-toolbar-control";

type PhiCommandToolbarButtonRuntimeState = {
  enabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  badge?: string | number | null;
  icon?: string | null;
  label?: string | null;
};

function resolveButtonSubcontrolAddress(blockId: PhiCmsInstanceId | null | undefined, key: string): PhiSignalAddress | null {
  return blockId == null ? null : createPhiSignalSubcontrolAddress("cms", blockId, key);
}

function readToolbarButtonSignalValue(signal: PhiSignal): string | number | boolean | null {
  if (signal.valueType === "string") {
    return typeof signal.value === "string" ? signal.value : signal.value == null ? "" : String(signal.value);
  }
  if (signal.valueType === "number") {
    return typeof signal.value === "number" && Number.isFinite(signal.value) ? signal.value : null;
  }
  if (signal.valueType === "boolean") {
    return typeof signal.value === "boolean" ? signal.value : null;
  }
  if (signal.valueType === "icon") {
    return typeof signal.value === "string" ? signal.value : null;
  }
  return null;
}

export function PhiCommandToolbarWidget({
  config,
  blockId,
  labels,
  disabled,
  signalsEnabled = true,
}: {
  config?: PhiCommandToolbarWidgetConfig | null;
  blockId?: PhiCmsInstanceId | null;
  labels?: PhiCommonControlLabels | null;
  disabled?: boolean;
  signalsEnabled?: boolean;
}) {
  const buttons = useMemo(() => config?.buttons ?? [], [config?.buttons]);
  const signalIdentity = usePhiSignalIdentity();
  const signalPartition = usePhiSignalRuntimePartition();
  const emitSignal = usePhiSignalEmitter(null);
  const emitRoutes = useMemo(() => config?.signalRoutes?.emits ?? [], [config?.signalRoutes?.emits]);
  const listenRoutes = useMemo(() => config?.signalRoutes?.listens ?? [], [config?.signalRoutes?.listens]);
  const [commandDisabled, setCommandDisabled] = useState<boolean | null>(null);
  const [buttonStateByKey, setButtonStateByKey] = useState<Record<string, PhiCommandToolbarButtonRuntimeState>>({});
  const resolvedDisabled = disabled || commandDisabled === true || config?.disabled === true;
  const readOnly = config?.readOnly === true;
  const toolbarReceiver = signalIdentity.sender;
  const buttonAddresses = useMemo(
    () => new Map(buttons.map((button) => [button.key, resolveButtonSubcontrolAddress(blockId, button.key)])),
    [blockId, buttons],
  );

  useEffect(() => {
    /*
     * A subcontrol only receives what its address is registered for, in the signal's own scope. The
     * identity context supplies a scope only inside an Overlay, so every toolbar outside one left its
     * buttons unregistered and every signal aimed at them was dropped before delivery -- which is why
     * Undo and Redo stayed clickable on an empty history. The scope a button is addressed in is the one
     * declared by the routes that address it; the identity scope stands in where no route names it.
     */
    const scopeByAddress = new Map<PhiSignalAddress, PhiSignal["scope"]>();
    for (const route of listenRoutes) {
      if (typeof route.receiver !== "string" || route.receiver === "broadcast") continue;
      if (!scopeByAddress.has(route.receiver)) scopeByAddress.set(route.receiver, route.scope);
    }
    const unregister = Array.from(buttonAddresses.values()).flatMap((address) => {
      const scope = address == null ? null : scopeByAddress.get(address) ?? signalIdentity.scope;
      return address == null || !scope
        ? []
        : [registerPhiSignalInstance(signalPartition, {
            address,
            scope,
          })];
    });
    return () => {
      for (const dispose of unregister) dispose();
    };
  }, [buttonAddresses, listenRoutes, signalIdentity.scope, signalPartition]);

  const readButtonKeyFromReceiver = useCallback(
    (receiver: PhiSignal["receiver"]) => {
      if (typeof receiver !== "string") {
        return null;
      }
      for (const [buttonKey, address] of buttonAddresses) {
        if (address === receiver) {
          return buttonKey;
        }
      }
      return null;
    },
    [buttonAddresses],
  );

  function publish(buttonKey: string) {
    if (!signalsEnabled || readOnly) {
      return;
    }

    const button = buttons.find((candidate) => candidate.key === buttonKey);
    if (!button) {
      return;
    }

    const sender = buttonAddresses.get(button.key) ?? toolbarReceiver;
    for (const buttonEmit of button.emits) {
      for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, buttonEmit.capabilityId)) {
        if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) {
          continue;
        }
        emitSignal({
          sender,
          scope: route.scope,
          channel: route.channel,
          action: route.action,
          value: route.valueType === "none" ? null : buttonEmit.value as PhiSignalValue,
          valueType: route.valueType,
          valueSchema: route.valueSchema ?? null,
          receiver: route.receiver,
        });
      }
    }
  }

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

      const targetsToolbar = signal.receiver === "broadcast" || (toolbarReceiver != null && signal.receiver === toolbarReceiver);
      const buttonKey = readButtonKeyFromReceiver(signal.receiver);
      if (!targetsToolbar && !buttonKey) {
        return;
      }

      if (targetsToolbar) {
        if (signal.channel === "enabled" && signal.action === "change") {
          setCommandDisabled(typeof signal.value === "boolean" ? !signal.value : false);
        }
        return;
      }

      if (!buttonKey) {
        return;
      }

      const value = readToolbarButtonSignalValue(signal);
      setButtonStateByKey((current) => {
        const previous = current[buttonKey] ?? {};
        if (signal.channel === "enabled" && signal.action === "change") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              enabled: typeof value === "boolean" ? value : undefined,
            },
          };
        }
        if (signal.channel === "visibility" && signal.action === "change") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              visible: typeof value === "boolean" ? value : undefined,
            },
          };
        }
        if (signal.channel === "loading" && signal.action === "change") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              loading: typeof value === "boolean" ? value : undefined,
            },
          };
        }
        if (signal.channel === "badge" && signal.action === "change") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              badge: typeof value === "string" || typeof value === "number" ? value : null,
            },
          };
        }
        if (signal.channel === "icon" && signal.action === "change") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              icon: typeof value === "string" ? value : null,
            },
          };
        }
        if (signal.channel === "label" && signal.action === "change") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              label: typeof value === "string" ? value : null,
            },
          };
        }
        return current;
      });
    },
    [listenRoutes, readButtonKeyFromReceiver, signalsEnabled, toolbarReceiver],
  );

  const signalFilter = useMemo(
    () => {
      if (listenRoutes.length === 0) {
        return null;
      }

      const valueSchemas = Array.from(
        new Set(listenRoutes.map((route) => route.valueSchema).filter((schema): schema is NonNullable<PhiSignalRoute["valueSchema"]> => Boolean(schema))),
      );

      return {
        scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
        channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
        ...(valueSchemas.length > 0 ? { valueSchemas } : null),
      };
    },
    [listenRoutes],
  );

  usePhiSignalListener(handleSignal, signalFilter);

  const controlItems = buttons.map((button) => {
    const buttonState = buttonStateByKey[button.key] ?? {};
    const action = resolvePhiCommonControlAction(labels, button.actionKey ?? button.key);
    const resolvedIcon = resolvePhiButtonIcon(buttonState.icon ?? button.icon ?? action?.icon ?? button.key);
    const label = buttonState.label ?? button.label ?? action?.label ?? button.key;
    return {
      key: button.key,
      ariaLabel: label,
      label,
      tooltip: button.tooltip ?? action?.tooltip,
      showLabel: button.display == null ? undefined : button.display !== "icon",
      type: button.buttonType ?? action?.buttonType ?? "default",
      danger: button.danger === true || action?.danger === true,
      disabled: button.disabled === true || buttonState.enabled === false,
      loading: buttonState.loading,
      icon: button.display === "label" ? null : resolvedIcon,
      visible: buttonState.visible,
      badge: buttonState.badge == null
        ? undefined
        : { enabled: true, value: buttonState.badge },
    };
  });

  return (
    <PhiToolbarControl
      items={controlItems}
      compact={config?.compact !== false}
      wrap={config?.wrap === true}
      showLabels={config?.showLabels === true}
      disabled={resolvedDisabled || readOnly}
      size={config?.controlSize}
      onActivate={publish}
    />
  );
}
